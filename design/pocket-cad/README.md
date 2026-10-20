# Pocket CAD assets · v1.0.0

The reusable visual system for EPSM: near-white workspaces, clear modern typography, pixel identities and restrained vermilion selection.

Read the [illustrated design manual](../../docs/design/README.md), then open the [offline specimen](preview.html) from a local checkout. No application imports this package automatically.

## Contents

| File or directory | Purpose |
| --- | --- |
| [`tokens.json`](tokens.json) | Versioned source for interface colours, type, spacing and dimensions |
| [`tokens.css`](tokens.css) | Generated `--epsm-*` custom properties |
| [`theme.css`](theme.css) | Opt-in styles under `.epsm-pocket-cad`, using `.pc-*` classes |
| [`maps.json`](maps.json) | Context, target, selection, hover and invalid overlay presets |
| [`tokens.manifest.json`](tokens.manifest.json) | Version and SHA-256 hashes of generated token exports |
| [`fonts/`](fonts/README.md) | Self-hosted Inter and IBM Plex Mono, pinned provenance and licences |
| [`icons/`](icons/catalogue.html) | Twelve identities, source grids, SVGs, PNGs, sprite and manifest |
| [`preview.html`](preview.html) | Accessible, offline component and map-style specimen |
| [`preview-data.js`](preview-data.js), [`preview.js`](preview.js) | Generated local token/icon data and specimen interactions |

Use UI tokens for interaction, the five icon colours for artwork, and the handbook's versioned palette for science. These layers share a visual family without sharing meanings. V1 defines a light UI; the icon pack also includes keylined dark-background README variants.

## Build and check

Run from the Studio repository root:

```sh
python3 design/pocket-cad/scripts/build_tokens.py
python3 design/pocket-cad/scripts/build_tokens.py --check
python3 design/pocket-cad/scripts/build_icons.py
python3 design/pocket-cad/scripts/build_icons.py --check
python3 design/pocket-cad/scripts/sync_readme_assets.py
python3 design/pocket-cad/scripts/sync_readme_assets.py --check
python3 design/pocket-cad/scripts/check_assets.py
```

The source JSON is authoritative. The token builder generates `tokens.css`, `maps.json`, `preview-data.js` and `tokens.manifest.json`; it reads the icon manifest to prepare the offline gallery. Build commands regenerate derived assets; `--check` verifies that checked-in output matches without writing. The synchronization command copies README identities to all twelve repositories under the same parent; use `--workspace-root` or `--repos` to target another checkout location or a subset. `check_assets.py` checks the local kit and manual without modifying files. Check the version and icon hashes before distributing copies to `docs/assets/brand/` in another repository.

## Minimal integration

Copy or bundle the package inside the consuming application, preserving the relative font paths. Load `tokens.css` before `theme.css`, and add `.epsm-pocket-cad` around the adopting view. The [adoption guide](../../docs/design/adoption.md) explains scope, maps and review criteria. No consumer needs a sibling checkout at runtime.

The CSS does not implement an accessible tab widget, routing, a map service or geometry validation. New map adapters must establish stable geometry IDs and explicit role metadata before applying the overlay palette. Legacy source is retained in Git history; there is no legacy map to restyle in the current scaffold.

## Licences and provenance

The original EPSM icons carry the [MIT licence](icons/LICENSE). Fonts carry their own OFL licences and pinned source versions under [`fonts/`](fonts/README.md). The raster images in the manual are reviewed design concepts, not native artwork sources, validated scientific results or implemented features.
