#!/usr/bin/env python3
"""Build installable RTLX browser ZIP packages from a fresh repository checkout.

This wrapper intentionally delegates the release packaging logic to
`scripts/package-release.mjs`, which is the project source of truth for
browser package ZIP creation and SHA256 manifest generation.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

TARGETS = ("chromium", "edge", "firefox", "firefox-android")
PUBLIC_NPM_REGISTRY = "https://registry.npmjs.org/"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Create RTLX installable browser ZIP files under dist/artifacts."
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Do not run npm ci even when node_modules is missing.",
    )
    parser.add_argument(
        "--npm",
        default="npm",
        help="npm executable to use. Default: npm",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    package_json = read_package_json(root)
    version = str(package_json.get("version", "unknown"))

    require_executable(args.npm)
    require_executable("node")

    if not args.skip_install and not (root / "node_modules").exists():
        sanitize_package_lock(root)
        npm_ci(root, args.npm)

    run([args.npm, "run", "build:release"], root)

    artifacts_dir = root / "dist" / "artifacts"
    zip_paths = [artifacts_dir / f"rtlx-{target}-{version}.zip" for target in TARGETS]
    missing = [str(path.relative_to(root)) for path in zip_paths if not path.is_file()]
    if missing:
        raise SystemExit("Missing expected browser package ZIP(s):\n" + "\n".join(missing))

    manifest_path = artifacts_dir / f"RTLX-v{version}-ARTIFACT-SHA256-MANIFEST.json"
    if not manifest_path.is_file():
        raise SystemExit(f"Missing artifact manifest: {manifest_path.relative_to(root)}")

    print("\nInstallable browser packages created:")
    for path in zip_paths:
        print(f"- {path.relative_to(root)}")
    print(f"- {manifest_path.relative_to(root)}")
    return 0


def read_package_json(root: Path) -> dict[str, object]:
    package_path = root / "package.json"
    with package_path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise SystemExit("package.json must contain a JSON object")
    return data


def sanitize_package_lock(root: Path) -> None:
    sanitizer = root / "scripts" / "ci-sanitize-package-lock-registry.mjs"
    if sanitizer.is_file():
        run(["node", str(sanitizer.relative_to(root))], root)


def npm_ci(root: Path, npm_executable: str) -> None:
    run(
        [
            npm_executable,
            "ci",
            "--include=dev",
            "--ignore-scripts",
            "--no-audit",
            "--fund=false",
            f"--registry={PUBLIC_NPM_REGISTRY}",
            "--replace-registry-host=always",
        ],
        root,
    )


def require_executable(command: str) -> None:
    executable = command.split()[0]
    if shutil.which(executable) is None:
        raise SystemExit(f"Required executable not found on PATH: {executable}")


def run(command: list[str], cwd: Path) -> None:
    env = os.environ.copy()
    env.setdefault("TZ", "UTC")
    env.setdefault("LC_ALL", "C")
    env.setdefault("NPM_CONFIG_REGISTRY", PUBLIC_NPM_REGISTRY)
    env.setdefault("NPM_CONFIG_REPLACE_REGISTRY_HOST", "always")
    print("$ " + " ".join(command))
    completed = subprocess.run(command, cwd=cwd, env=env, check=False)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


if __name__ == "__main__":
    sys.exit(main())
