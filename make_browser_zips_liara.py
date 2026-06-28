#!/usr/bin/env python3
"""Build installable RTLX browser ZIP packages from a fresh repository checkout.

This wrapper delegates release packaging to ``scripts/package-release.mjs``,
which remains the project source of truth for ZIP creation and SHA-256 manifest
generation.

Compared with the original wrapper, dependency installation is hardened by:

* reporting the exact Node.js/npm toolchain;
* isolating npm cache state from the user's global cache;
* reusing one build-scoped cache across retries so completed downloads are retained;
* limiting registry concurrency to avoid Windows/proxy connection-reset storms;
* writing npm debug logs into the repository's ``dist/build-logs`` directory;
* retrying only known transient/npm-internal failures with bounded backoff;
* removing a partial ``node_modules`` tree before a retry;
* preserving ``npm ci`` lockfile semantics (there is no ``npm install`` fallback);
* using Liara's npm mirror by default while allowing an explicit registry override.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import locale
import logging
import os
import shlex
import shutil
import stat
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Final, Iterator, Sequence
from urllib.parse import urlsplit, urlunsplit

TARGETS: Final[tuple[str, ...]] = (
    "chromium",
    "edge",
    "firefox",
    "firefox-android",
)
PUBLIC_NPM_REGISTRY: Final[str] = "https://registry.npmjs.org/"
LIARA_NPM_REGISTRY: Final[str] = "https://package-mirror.liara.ir/repository/npm/"
DEFAULT_NPM_REGISTRY: Final[str] = LIARA_NPM_REGISTRY
SANITIZER_SCRIPT: Final[str] = "scripts/ci-sanitize-package-lock-registry.mjs"
DEFAULT_INSTALL_ATTEMPTS: Final[int] = 3
MAX_INSTALL_ATTEMPTS: Final[int] = 5
DEFAULT_NPM_MAXSOCKETS: Final[int] = 4
MAX_NPM_MAXSOCKETS: Final[int] = 15
DEFAULT_FETCH_RETRIES: Final[int] = 5
MAX_FETCH_RETRIES: Final[int] = 10

# A retry is intentionally limited to failures that can reasonably disappear
# after process/cache/filesystem isolation. Dependency-resolution and lockfile
# errors are not retried or converted into success.
RETRYABLE_NPM_MARKERS: Final[tuple[str, ...]] = (
    "exit handler never called",
    "econnreset",
    "etimedout",
    "err_socket_timeout",
    "eai_again",
    "epipe",
    "ebusy",
    "eperm",
)

logging.basicConfig(
    format="%(levelname)s: %(message)s",
    level=logging.INFO,
    stream=sys.stderr,
)
log = logging.getLogger(__name__)


class BuildError(RuntimeError):
    """Raised when a build step fails; carries a human-readable message."""


@dataclass(frozen=True, slots=True)
class CommandResult:
    returncode: int
    output: str


@dataclass(frozen=True, slots=True)
class BuildConfig:
    root: Path
    npm: str = "npm"
    skip_install: bool = False
    install_attempts: int = DEFAULT_INSTALL_ATTEMPTS
    npm_maxsockets: int = DEFAULT_NPM_MAXSOCKETS
    fetch_retries: int = DEFAULT_FETCH_RETRIES
    registry: str = DEFAULT_NPM_REGISTRY

    @property
    def env_forced(self) -> dict[str, str]:
        """Return deterministic process environment for the selected registry."""
        return {
            "TZ": "UTC",
            "LC_ALL": "C",
            "NPM_CONFIG_REGISTRY": self.registry,
            "NPM_CONFIG_REPLACE_REGISTRY_HOST": "always",
        }


def normalize_registry_url(value: str) -> str:
    """Validate and normalize an HTTPS npm-compatible registry URL."""
    candidate = value.strip()
    parts = urlsplit(candidate)
    if parts.scheme.lower() != "https" or not parts.netloc:
        raise ValueError("registry must be an absolute HTTPS URL")
    if parts.username or parts.password:
        raise ValueError("registry URL must not contain embedded credentials")
    if parts.query or parts.fragment:
        raise ValueError("registry URL must not contain a query or fragment")

    normalized_path = parts.path.rstrip("/") + "/"
    return urlunsplit(("https", parts.netloc, normalized_path, "", ""))


def parse_args(argv: Sequence[str] | None = None) -> BuildConfig:
    parser = argparse.ArgumentParser(
        description="Create RTLX installable browser ZIP files under dist/artifacts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help=(
            "Do not run `npm ci`. Use only when dependencies were installed "
            "successfully for this exact checkout and toolchain."
        ),
    )
    parser.add_argument(
        "--npm",
        default="npm",
        metavar="EXECUTABLE",
        help="npm executable to use (default: npm).",
    )
    parser.add_argument(
        "--registry",
        default=DEFAULT_NPM_REGISTRY,
        metavar="HTTPS_URL",
        help=(
            "npm-compatible registry used for dependency downloads "
            f"(default: Liara mirror at {DEFAULT_NPM_REGISTRY}). "
            f"Use {PUBLIC_NPM_REGISTRY} to force the official registry."
        ),
    )
    parser.add_argument(
        "--install-attempts",
        type=int,
        default=DEFAULT_INSTALL_ATTEMPTS,
        metavar="N",
        help=(
            "Maximum npm-ci attempts for retryable internal/transient failures "
            f"(default: {DEFAULT_INSTALL_ATTEMPTS}, max: {MAX_INSTALL_ATTEMPTS})."
        ),
    )
    parser.add_argument(
        "--npm-maxsockets",
        type=int,
        default=DEFAULT_NPM_MAXSOCKETS,
        metavar="N",
        help=(
            "Maximum concurrent registry connections on the first attempt "
            f"(default: {DEFAULT_NPM_MAXSOCKETS}, max: {MAX_NPM_MAXSOCKETS}). "
            "Later attempts reduce this automatically."
        ),
    )
    parser.add_argument(
        "--fetch-retries",
        type=int,
        default=DEFAULT_FETCH_RETRIES,
        metavar="N",
        help=(
            "Per-request npm registry retries "
            f"(default: {DEFAULT_FETCH_RETRIES}, max: {MAX_FETCH_RETRIES})."
        ),
    )
    ns = parser.parse_args(argv)

    if not 1 <= ns.install_attempts <= MAX_INSTALL_ATTEMPTS:
        parser.error(f"--install-attempts must be between 1 and {MAX_INSTALL_ATTEMPTS}")
    if not 1 <= ns.npm_maxsockets <= MAX_NPM_MAXSOCKETS:
        parser.error(f"--npm-maxsockets must be between 1 and {MAX_NPM_MAXSOCKETS}")
    if not 0 <= ns.fetch_retries <= MAX_FETCH_RETRIES:
        parser.error(f"--fetch-retries must be between 0 and {MAX_FETCH_RETRIES}")

    try:
        registry = normalize_registry_url(ns.registry)
    except ValueError as exc:
        parser.error(f"invalid --registry value: {exc}")

    return BuildConfig(
        root=Path(__file__).resolve().parent,
        npm=ns.npm,
        skip_install=ns.skip_install,
        install_attempts=ns.install_attempts,
        npm_maxsockets=ns.npm_maxsockets,
        fetch_retries=ns.fetch_retries,
        registry=registry,
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


def merged_environment(env_forced: dict[str, str]) -> dict[str, str]:
    env = os.environ.copy()
    env.update(env_forced)
    return env


def run_streaming(
    command: Sequence[str],
    cwd: Path,
    env_forced: dict[str, str],
) -> CommandResult:
    """Run a command, stream combined output, and retain it for diagnostics."""
    rendered = render_command(command)
    log.info("$ %s (cwd: %s)", rendered, cwd)

    encoding = locale.getpreferredencoding(False) or "utf-8"
    process = subprocess.Popen(
        command_for_subprocess(command),
        cwd=cwd,
        env=merged_environment(env_forced),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding=encoding,
        errors="replace",
        bufsize=1,
    )

    output_parts: list[str] = []
    assert process.stdout is not None
    for line in process.stdout:
        output_parts.append(line)
        sys.stderr.write(line)
        sys.stderr.flush()

    returncode = process.wait()
    return CommandResult(returncode=returncode, output="".join(output_parts))


def run(command: Sequence[str], cwd: Path, env_forced: dict[str, str]) -> None:
    """Run a command and raise BuildError on non-zero exit."""
    result = run_streaming(command, cwd, env_forced)
    if result.returncode != 0:
        raise BuildError(
            f"Command exited with code {result.returncode}: "
            f"{render_command(command)} (cwd: {cwd})"
        )


def query_version(executable: str, cwd: Path, env_forced: dict[str, str]) -> str:
    """Return an executable's single-line ``--version`` output."""
    command = [executable, "--version"]
    result = subprocess.run(
        command_for_subprocess(command),
        cwd=cwd,
        env=merged_environment(env_forced),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding=locale.getpreferredencoding(False) or "utf-8",
        errors="replace",
        check=False,
    )
    output = result.stdout.strip()
    if result.returncode != 0 or not output:
        raise BuildError(
            f"Could not determine version for executable {executable!r}; "
            f"exit code {result.returncode}."
        )
    return output.splitlines()[-1].strip()


def report_toolchain(cfg: BuildConfig) -> tuple[str, str]:
    node_version = query_version("node", cfg.root, cfg.env_forced)
    npm_version = query_version(cfg.npm, cfg.root, cfg.env_forced)
    log.info("Release toolchain: node %s; npm %s", node_version, npm_version)
    return node_version, npm_version


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
    """Validate release-critical package metadata and return package version."""
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


def _clear_readonly_and_retry(function: object, path: str, _exc_info: object) -> None:
    """Best-effort Windows cleanup callback for read-only dependency files."""
    os.chmod(path, stat.S_IWRITE | stat.S_IREAD)
    if callable(function):
        function(path)


def remove_tree_with_retries(path: Path, attempts: int = 4) -> None:
    """Remove a tree, tolerating short-lived Windows file locks."""
    if not path.exists():
        return

    last_error: OSError | None = None
    for attempt in range(1, attempts + 1):
        try:
            shutil.rmtree(path, onerror=_clear_readonly_and_retry)
            return
        except OSError as exc:
            last_error = exc
            if attempt == attempts:
                break
            delay = 0.4 * attempt
            log.warning(
                "Could not remove %s on cleanup attempt %d/%d; retrying ...",
                path,
                attempt,
                attempts,
            )
            time.sleep(delay)

    raise BuildError(f"Could not remove partial dependency tree {path}: {last_error}")



@contextmanager
def build_scoped_npm_cache() -> Iterator[Path]:
    """Yield one isolated cache shared by all attempts in this build invocation.

    Sharing only within the current invocation preserves successful downloads after
    an ECONNRESET while still preventing the user's global npm cache from affecting
    release installation behavior.
    """
    cache_dir = Path(tempfile.mkdtemp(prefix="rtlx-npm-cache-"))
    try:
        yield cache_dir
    finally:
        try:
            remove_tree_with_retries(cache_dir)
        except BuildError as exc:
            # Cache cleanup is non-release state. A transient antivirus/file lock
            # must not turn an otherwise valid package build into a false failure.
            log.warning("Could not remove temporary npm cache %s: %s", cache_dir, exc)

def prepare_attempt_log_dir(root: Path, attempt: int) -> Path:
    log_dir = root / "dist" / "build-logs" / "npm-ci" / f"attempt-{attempt}"
    remove_tree_with_retries(log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)
    return log_dir


def npm_install_command(
    cfg: BuildConfig,
    cache_dir: Path,
    log_dir: Path,
    attempt: int,
) -> list[str]:
    # Degrade concurrency deterministically after each network-related retry:
    # default profile is 4 -> 2 -> 1 sockets. npm's default is 15, which can
    # trigger simultaneous ECONNRESET failures behind some Windows proxies,
    # antivirus HTTPS inspection layers, routers, or unstable connections.
    maxsockets = max(1, cfg.npm_maxsockets // (2 ** (attempt - 1)))
    command = [
        cfg.npm,
        "ci",
        "--include=dev",
        "--ignore-scripts",
        "--no-audit",
        "--fund=false",
        "--progress=false",
        f"--registry={cfg.registry}",
        "--replace-registry-host=always",
        f"--cache={cache_dir}",
        f"--logs-dir={log_dir}",
        f"--maxsockets={maxsockets}",
        f"--fetch-retries={cfg.fetch_retries}",
        "--fetch-retry-factor=2",
        "--fetch-retry-mintimeout=15000",
        "--fetch-retry-maxtimeout=120000",
        "--fetch-timeout=300000",
    ]
    if attempt > 1:
        # Reuse verified cache entries from the previous attempt and fetch only
        # missing content. This does not make the install offline or alter locks.
        command.append("--prefer-offline")
    return command


def npm_install_environment(cfg: BuildConfig) -> dict[str, str]:
    env = dict(cfg.env_forced)
    env.update(
        {
            "NO_COLOR": "1",
            "NPM_CONFIG_COLOR": "false",
            "NPM_CONFIG_PROGRESS": "false",
            "NPM_CONFIG_UPDATE_NOTIFIER": "false",
        }
    )
    return env


def is_retryable_npm_failure(output: str) -> bool:
    normalized = output.casefold()
    return any(marker in normalized for marker in RETRYABLE_NPM_MARKERS)


def npm_install(cfg: BuildConfig, node_version: str, npm_version: str) -> None:
    """Run deterministic npm ci with isolated state and bounded retries."""
    node_modules = cfg.root / "node_modules"
    install_env = npm_install_environment(cfg)
    last_result: CommandResult | None = None
    last_log_dir: Path | None = None

    # One isolated cache per build, deliberately shared across attempts. A fresh
    # cache per attempt would discard all successfully downloaded tarballs and
    # repeat the same network load after an ECONNRESET storm.
    with build_scoped_npm_cache() as cache_dir:
        for attempt in range(1, cfg.install_attempts + 1):
            log_dir = prepare_attempt_log_dir(cfg.root, attempt)
            last_log_dir = log_dir
            maxsockets = max(1, cfg.npm_maxsockets // (2 ** (attempt - 1)))

            log.info(
                "npm ci attempt %d/%d; shared isolated cache; maxsockets=%d; "
                "debug logs: %s",
                attempt,
                cfg.install_attempts,
                maxsockets,
                log_dir.relative_to(cfg.root),
            )
            result = run_streaming(
                npm_install_command(cfg, cache_dir, log_dir, attempt),
                cfg.root,
                install_env,
            )
            last_result = result

            if result.returncode == 0:
                return

            retryable = is_retryable_npm_failure(result.output)
            if not retryable or attempt == cfg.install_attempts:
                break

            log.warning(
                "npm ci failed with a retryable internal/transient signature. "
                "Keeping verified cache downloads, removing only node_modules, "
                "then retrying with lower registry concurrency."
            )
            remove_tree_with_retries(node_modules)

    assert last_result is not None
    log_hint = (
        str(last_log_dir.relative_to(cfg.root))
        if last_log_dir is not None
        else "npm's configured log directory"
    )
    retry_class = (
        "retryable signature persisted"
        if is_retryable_npm_failure(last_result.output)
        else "non-retryable dependency/lockfile failure"
    )
    raise BuildError(
        "npm ci failed after "
        f"{cfg.install_attempts} permitted attempt(s) ({retry_class}). "
        f"Toolchain: node {node_version}; npm {npm_version}. "
        f"Registry: {cfg.registry}. Inspect logs under {log_hint}. "
        "If ECONNRESET persists at maxsockets=1, "
        "the remaining cause is outside the repository (network/proxy/VPN/HTTPS "
        "inspection or registry reachability). No npm-install fallback was used."
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
    """Return ZIP paths and manifest path after checksum validation."""
    artifacts_dir = root / "dist" / "artifacts"

    zip_paths = [artifacts_dir / f"rtlx-{target}-{version}.zip" for target in TARGETS]
    missing_zips = [path for path in zip_paths if not path.is_file()]
    if missing_zips:
        missing_rel = "\n".join(f"  - {path.relative_to(root)}" for path in missing_zips)
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
    node_version, npm_version = report_toolchain(cfg)

    log.info("Dependency registry: %s", cfg.registry)

    if not cfg.skip_install:
        log.info("Running npm ci for locked release dependencies ...")
        maybe_sanitize_package_lock(cfg)
        npm_install(cfg, node_version, npm_version)
    else:
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
    except KeyboardInterrupt:
        log.error("Build interrupted by user.")
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
