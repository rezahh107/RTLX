#!/usr/bin/env python3
"""Build installable RTLX browser ZIP packages from a fresh repository checkout.

This wrapper delegates release packaging to `scripts/package-release.mjs`,
which is the project source of truth for ZIP creation and SHA256 manifest generation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import shlex
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Final, Sequence

TARGETS: Final[tuple[str, ...]] = ("chromium", "edge", "firefox", "firefox-android")
PUBLIC_NPM_REGISTRY: Final[str] = "https://registry.npmjs.org/"
SANITIZER_SCRIPT: Final[str] = "scripts/ci-sanitize-package-lock-registry.mjs"

logging.basicConfig(
    format="%(levelname)s: %(message)s",
    level=logging.INFO,
    stream=sys.stderr,
)
log = logging.getLogger(__name__)


class BuildError(RuntimeError):
    """Raised when any build step fails; carries a human-readable message."""


@dataclass(frozen=True, slots=True)
class BuildConfig:
    root: Path
    npm: str = "npm"
    skip_install: bool = False
    env_forced: dict[str, str] = field(
        default_factory=lambda: {
            "TZ": "UTC",
            "LC_ALL": "C",
            "NPM_CONFIG_REGISTRY": PUBLIC_NPM_REGISTRY,
            "NPM_CONFIG_REPLACE_REGISTRY_HOST": "always",
        }
    )


def parse_args(argv: Sequence[str] | None = None) -> BuildConfig:
    parser = argparse.ArgumentParser(
        description="Create RTLX installable browser ZIP files under dist/artifacts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help=(
            "Do not run `npm ci`. By default this script always reinstalls "
            "locked dependencies."
        ),
    )
    parser.add_argument(
        "--npm",
        default="npm",
        metavar="EXECUTABLE",
        help="npm executable to use (default: npm).",
    )
    ns = parser.parse_args(argv)
    return BuildConfig(
        root=Path(__file__).resolve().parent,
        npm=ns.npm,
        skip_install=ns.skip_install,
    )


def resolve_executable(name: str) -> str:
    """Return an executable path that subprocess can launch on the current OS."""
    candidates = [name]
    if os.name == "nt" and Path(name).suffix == "":
        candidates.extend([f"{name}.cmd", f"{name}.exe", f"{name}.bat"])

    for candidate in candidates:
        resolved = shutil.which(candidate)
        if resolved is not None:
            return resolved

    raise BuildError(f"Required executable not found on PATH: {name!r}")


def require_executable(name: str) -> None:
    """Raise BuildError if *name* is not found on PATH."""
    resolve_executable(name)


def render_command(command: Sequence[str]) -> str:
    """Return a shell-readable command string for diagnostics."""
    return shlex.join(command)


def command_for_subprocess(command: Sequence[str]) -> list[str]:
    """Resolve the executable token while preserving display-friendly commands."""
    if not command:
        raise BuildError("Cannot run an empty command.")
    executable = resolve_executable(command[0])
    return [executable, *command[1:]]


def run(command: list[str], cwd: Path, env_forced: dict[str, str]) -> None:
    """Run *command* in *cwd*, enforcing deterministic release environment values."""
    env = os.environ.copy()
    env.update(env_forced)

    rendered = render_command(command)
    log.info("$ %s (cwd: %s)", rendered, cwd)
    result = subprocess.run(command_for_subprocess(command), cwd=cwd, env=env, check=False)
    if result.returncode != 0:
        raise BuildError(
            f"Command exited with code {result.returncode}: {rendered} (cwd: {cwd})"
        )


def read_package_json(root: Path) -> dict[str, object]:
    package_path = root / "package.json"
    try:
        with package_path.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError as exc:
        raise BuildError(f"package.json not found at {package_path}") from exc
    except json.JSONDecodeError as exc:
        raise BuildError(f"Invalid JSON in package.json: {exc}") from exc

    if not isinstance(data, dict):
        raise BuildError("package.json must contain a JSON object at the top level.")
    return data


def read_release_metadata(root: Path) -> str:
    """Validate release-critical package metadata and return the package version."""
    package_json = read_package_json(root)

    version = package_json.get("version")
    if not isinstance(version, str) or not version.strip():
        raise BuildError("package.json must define a non-empty string `version`.")

    scripts = package_json.get("scripts")
    if not isinstance(scripts, dict) or not isinstance(scripts.get("build:release"), str):
        raise BuildError("package.json must define a `scripts.build:release` command.")

    return version


def maybe_sanitize_package_lock(cfg: BuildConfig) -> None:
    sanitizer = cfg.root / SANITIZER_SCRIPT
    if sanitizer.is_file():
        run(["node", str(sanitizer.relative_to(cfg.root))], cfg.root, cfg.env_forced)


def npm_install(cfg: BuildConfig) -> None:
    run(
        [
            cfg.npm,
            "ci",
            "--include=dev",
            "--ignore-scripts",
            "--no-audit",
            "--fund=false",
            f"--registry={PUBLIC_NPM_REGISTRY}",
            "--replace-registry-host=always",
        ],
        cfg.root,
        cfg.env_forced,
    )


def npm_build(cfg: BuildConfig) -> None:
    run([cfg.npm, "run", "build:release"], cfg.root, cfg.env_forced)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_manifest(manifest_path: Path) -> dict[str, object]:
    try:
        with manifest_path.open(encoding="utf-8") as fh:
            manifest = json.load(fh)
    except json.JSONDecodeError as exc:
        raise BuildError(f"Invalid JSON in artifact manifest: {exc}") from exc

    if not isinstance(manifest, dict):
        raise BuildError("Artifact manifest must contain a JSON object at the top level.")
    return manifest


def manifest_file_records(manifest: dict[str, object]) -> dict[str, dict[str, object]]:
    if manifest.get("hashAlgorithm") != "sha256":
        raise BuildError("Artifact manifest must use hashAlgorithm `sha256`.")

    files = manifest.get("files")
    if not isinstance(files, list):
        raise BuildError("Artifact manifest must contain a `files` array.")

    records: dict[str, dict[str, object]] = {}
    for index, record in enumerate(files):
        if not isinstance(record, dict):
            raise BuildError(f"Artifact manifest file entry #{index} must be an object.")

        relative_path = record.get("path")
        if not isinstance(relative_path, str) or not relative_path:
            raise BuildError(f"Artifact manifest file entry #{index} has an invalid path.")
        normalized_path = relative_path.replace("\\", "/").removeprefix("./")
        if (
            not normalized_path
            or normalized_path.startswith("/")
            or ".." in normalized_path.split("/")
        ):
            raise BuildError(f"Artifact manifest contains unsafe path: {relative_path!r}")
        if normalized_path in records:
            raise BuildError(f"Artifact manifest contains duplicate path: {normalized_path}")

        size = record.get("size")
        checksum = record.get("sha256")
        if not isinstance(size, int) or size < 0:
            raise BuildError(f"Artifact manifest entry has invalid size: {normalized_path}")
        if not isinstance(checksum, str) or len(checksum) != 64:
            raise BuildError(f"Artifact manifest entry has invalid sha256: {normalized_path}")

        records[normalized_path] = record
    return records


def verify_artifacts(root: Path, version: str) -> tuple[list[Path], Path]:
    """Return (zip_paths, manifest_path) after validating ZIPs and manifest checksums."""
    artifacts_dir = root / "dist" / "artifacts"

    zip_paths = [artifacts_dir / f"rtlx-{target}-{version}.zip" for target in TARGETS]
    missing_zips = [p for p in zip_paths if not p.is_file()]
    if missing_zips:
        missing_rel = "\n".join(f"  - {p.relative_to(root)}" for p in missing_zips)
        raise BuildError(f"Missing expected browser ZIP(s):\n{missing_rel}")

    manifest_path = artifacts_dir / f"RTLX-v{version}-ARTIFACT-SHA256-MANIFEST.json"
    if not manifest_path.is_file():
        raise BuildError(f"Missing artifact manifest: {manifest_path.relative_to(root)}")

    manifest = read_manifest(manifest_path)
    if manifest.get("release") != version:
        raise BuildError(
            f"Artifact manifest release mismatch: expected {version!r}, "
            f"got {manifest.get('release')!r}"
        )

    records = manifest_file_records(manifest)
    for zip_path in zip_paths:
        relative_name = zip_path.name
        record = records.get(relative_name)
        if record is None:
            raise BuildError(f"Artifact manifest is missing ZIP entry: {relative_name}")

        actual_size = zip_path.stat().st_size
        if actual_size != record["size"]:
            raise BuildError(
                f"Artifact size mismatch for {relative_name}: "
                f"expected {record['size']}, got {actual_size}"
            )

        actual_sha256 = sha256_file(zip_path)
        if actual_sha256 != record["sha256"]:
            raise BuildError(
                f"Artifact SHA-256 mismatch for {relative_name}: "
                f"expected {record['sha256']}, got {actual_sha256}"
            )

    expected_names = {path.name for path in zip_paths}
    manifest_names = set(records)
    if manifest_names != expected_names:
        missing = sorted(expected_names - manifest_names)
        extra = sorted(manifest_names - expected_names)
        details = []
        if missing:
            details.append(f"missing: {', '.join(missing)}")
        if extra:
            details.append(f"unexpected: {', '.join(extra)}")
        raise BuildError(
            "Artifact manifest entries do not match expected ZIPs "
            f"({'; '.join(details)})."
        )

    return zip_paths, manifest_path


def build(cfg: BuildConfig) -> None:
    version = read_release_metadata(cfg.root)
    log.info("Building RTLX v%s", version)

    require_executable(cfg.npm)
    require_executable("node")

    if not cfg.skip_install:
        log.info("Running npm ci for locked release dependencies ...")
        maybe_sanitize_package_lock(cfg)
        npm_install(cfg)
    elif cfg.skip_install:
        log.info("--skip-install set; skipping npm ci.")

    npm_build(cfg)

    zip_paths, manifest_path = verify_artifacts(cfg.root, version)

    log.info("\nInstallable browser packages created:")
    for path in zip_paths:
        log.info("  ✓ %s", path.relative_to(cfg.root))
    log.info("  ✓ %s", manifest_path.relative_to(cfg.root))


def main(argv: Sequence[str] | None = None) -> int:
    cfg = parse_args(argv)
    try:
        build(cfg)
    except BuildError as exc:
        log.error("%s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
