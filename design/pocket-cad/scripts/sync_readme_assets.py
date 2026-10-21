#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
"""Copy versioned Pocket CAD README images into the named sibling repositories.

Only docs/assets/brand/ is written. Repository descriptions and other source
files are never changed. Use --check to verify committed copies without writing.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import struct
import sys


DESIGN_ROOT = Path(__file__).resolve().parents[1]
ICON_ROOT = DESIGN_ROOT / "icons"
# This explicit list defines the entire cross-repository distribution scope.
REPOSITORY_DIRECTORIES = {
    "epsm": "epsm",
    "epsm_core": "epsm_core",
    "epsm_data": "epsm_data",
    "epsm_db": "epsm_db",
    "epsm_development": "epsm_development",
    "epsm_lca": "epsm_lca",
    "epsm_rc": "epsm_rc",
    "epsm_studies": "epsm_studies",
    "epsm_studio": "epsm_studio",
    "epsm_viewer": "epsm_viewer",
    "epsm_workflows": "epsm_workflows",
    "smhi2epw": "smhi2epw",
}


def sha256(data: bytes) -> str:
    """Return the content identity used by the canonical icon manifest."""
    return hashlib.sha256(data).hexdigest()


def canonical_images() -> tuple[dict, bytes, bytes, dict[str, dict]]:
    """Validate the manifest and 64 px exports before touching any checkout."""
    manifest_bytes = (ICON_ROOT / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    if manifest.get("hash_algorithm") != "sha256" or manifest.get("license") != "MIT":
        raise ValueError("Expected the SHA256, MIT-licensed Pocket CAD manifest")
    icons = {icon["id"]: icon for icon in manifest["icons"]}
    if set(icons) != set(REPOSITORY_DIRECTORIES):
        raise ValueError("Canonical icons must match the 12 named repositories")
    if len(manifest["icons"]) != len(icons):
        raise ValueError("Canonical manifest contains duplicate icon identifiers")
    license_bytes = (ICON_ROOT / "LICENSE").read_bytes()
    if b"MIT License" not in license_bytes:
        raise ValueError("Canonical icon LICENSE is missing its MIT notice")
    exports = {}
    for identifier, icon in icons.items():
        exports[identifier] = {}
        for variant, kind in (("light", "png"), ("dark", "dark_png")):
            relative = icon["files"][kind]["64"]
            path = (ICON_ROOT / relative).resolve()
            if not path.is_relative_to(ICON_ROOT.resolve()):
                raise ValueError(f"Icon path leaves the canonical pack: {relative}")
            data = path.read_bytes()
            identity = sha256(data)
            if identity != icon["filehashes"][relative]:
                raise ValueError(f"Canonical export checksum mismatch: {relative}")
            if (
                data[:8] != b"\x89PNG\r\n\x1a\n"
                or data[12:16] != b"IHDR"
                or struct.unpack(">II", data[16:24]) != (64, 64)
            ):
                raise ValueError(f"Expected a 64 by 64 PNG: {relative}")
            exports[identifier][variant] = {
                "bytes": data,
                "source": relative,
                "sha256": identity,
            }
    return manifest, manifest_bytes, license_bytes, exports


def expected_files(
    repository: str,
    manifest: dict,
    manifest_bytes: bytes,
    license_bytes: bytes,
    exports: dict[str, dict],
) -> dict[str, bytes]:
    """Build one repository's copies and a portable provenance manifest."""
    identifiers = list(REPOSITORY_DIRECTORIES) if repository == "epsm" else [repository]
    files = {"LICENSE": license_bytes}
    records = []
    for identifier in identifiers:
        for variant in ("light", "dark"):
            export = exports[identifier][variant]
            filename = f"{identifier}{'-dark' if variant == 'dark' else ''}.png"
            files[filename] = export["bytes"]
            records.append({
                "path": filename,
                "id": identifier,
                "variant": variant,
                "source": export["source"],
                "sha256": export["sha256"],
            })
    copied_manifest = {
        "name": manifest["name"],
        "version": manifest["version"],
        "canonical_repository": "SB-Chalmers/epsm_studio",
        "canonical_directory": "design/pocket-cad/icons",
        "canonical_manifest_sha256": sha256(manifest_bytes),
        "hash_algorithm": "sha256",
        "license": "MIT",
        "license_sha256": sha256(license_bytes),
        "repository": repository,
        "files": records,
    }
    files["manifest.json"] = (
        json.dumps(copied_manifest, indent=2, sort_keys=True) + "\n"
    ).encode("utf-8")
    return files


def main() -> int:
    """Synchronize explicit README asset destinations or report their drift."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--workspace-root",
        type=Path,
        default=DESIGN_ROOT.parents[2],
        help="Parent directory containing the named sibling EPSM checkouts",
    )
    parser.add_argument(
        "--repos",
        nargs="+",
        choices=list(REPOSITORY_DIRECTORIES),
        default=list(REPOSITORY_DIRECTORIES),
        help="Explicit subset of repositories; defaults to all 12",
    )
    parser.add_argument("--check", action="store_true", help="Verify without writing")
    args = parser.parse_args()
    try:
        manifest, manifest_bytes, license_bytes, exports = canonical_images()
        workspace = args.workspace_root.resolve()
        destinations = []
        for repository in dict.fromkeys(args.repos):
            root = workspace / REPOSITORY_DIRECTORIES[repository]
            if not root.is_dir() or not (root / "README.md").is_file():
                raise ValueError(f"Expected a sibling repository with a README: {root}")
            if root.resolve().parent != workspace:
                raise ValueError(f"Repository resolves outside the workspace: {root}")
            destination = root / "docs" / "assets" / "brand"
            if not destination.resolve().is_relative_to(root.resolve()):
                raise ValueError(f"Asset destination leaves its repository: {destination}")
            files = expected_files(repository, manifest, manifest_bytes, license_bytes, exports)
            for name in files:
                path = destination / name
                if path.is_symlink():
                    raise ValueError(f"Refusing a symlink asset destination: {path}")
            destinations.append((repository, destination, files))
        drift = []
        for repository, destination, files in destinations:
            for name, data in files.items():
                path = destination / name
                if path.exists() and path.read_bytes() == data:
                    continue
                if args.check:
                    drift.append(str(path))
                else:
                    destination.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(data)
            if not args.check:
                print(f"Synced {repository}: {len(files) - 2} PNGs, manifest and MIT license")
        if drift:
            print("README icon copies are missing or differ from the canonical pack:", file=sys.stderr)
            for path in drift:
                print(f"  {path}", file=sys.stderr)
            return 1
        if args.check:
            count = sum(len(files) - 2 for _, _, files in destinations)
            print(f"Verified {count} PNGs across {len(destinations)} repositories, including manifests and licenses")
        return 0
    except (OSError, ValueError, KeyError, TypeError, struct.error) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
