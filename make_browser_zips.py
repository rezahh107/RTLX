#!/usr/bin/env python3
"""Build installable RTLX browser ZIP packages from a fresh repository checkout.

This wrapper delegates release packaging to `scripts/package-release.mjs`,
which is the project source of truth for ZIP creation and SHA256 manifest generation.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
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
    env_overrides: dict[str, str] = field(
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
        help="Do not run `npm ci` even when node_modules is absent.",
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


def require_executable(name: str) -> None:
    """Raise BuildError if *name* is not found on PATH."""
    if shutil.which(name) is None:
        raise BuildError(f"Required executable not found on PATH: {name!r}")


def run(command: list[str], cwd: Path, env_overrides: dict[str, str]) -> None:
    """Run *command* in *cwd*, applying env_overrides with setdefault semantics."""
    env = os.environ.copy()
    for key, value in env_overrides.items():
        env.setdefault(key, value)

    log.info("$ %s", " ".join(command))
    result = subprocess.run(command, cwd=cwd, env=env, check=False)
    if result.returncode != 0:
        raise BuildError(f"Command exited with code {result.returncode}: {' '.join(command)}")


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


def maybe_sanitize_package_lock(cfg: BuildConfig) -> None:
    sanitizer = cfg.root / SANITIZER_SCRIPT
    if sanitizer.is_file():
        run(["node", str(sanitizer.relative_to(cfg.root))], cfg.root, cfg.env_overrides)


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
        cfg.env_overrides,
    )


def npm_build(cfg: BuildConfig) -> None:
    run([cfg.npm, "run", "build:release"], cfg.root, cfg.env_overrides)


def verify_artifacts(root: Path, version: str) -> tuple[list[Path], Path]:
    """Return (zip_paths, manifest_path) or raise BuildError if anything is missing."""
    artifacts_dir = root / "dist" / "artifacts"

    zip_paths = [artifacts_dir / f"rtlx-{target}-{version}.zip" for target in TARGETS]
    missing_zips = [p for p in zip_paths if not p.is_file()]
    if missing_zips:
        missing_rel = "\n".join(f"  - {p.relative_to(root)}" for p in missing_zips)
        raise BuildError(f"Missing expected browser ZIP(s):\n{missing_rel}")

    manifest_path = artifacts_dir / f"RTLX-v{version}-ARTIFACT-SHA256-MANIFEST.json"
    if not manifest_path.is_file():
        raise BuildError(f"Missing artifact manifest: {manifest_path.relative_to(root)}")

    return zip_paths, manifest_path


def build(cfg: BuildConfig) -> None:
    package_json = read_package_json(cfg.root)
    version = str(package_json.get("version", "unknown"))
    log.info("Building RTLX v%s", version)

    require_executable(cfg.npm)
    require_executable("node")

    node_modules = cfg.root / "node_modules"
    if not cfg.skip_install and not node_modules.exists():
        log.info("node_modules absent — running npm ci ...")
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
