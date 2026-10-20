# Adopt Pocket CAD

[Manual](README.md) · [Foundations](foundations.md) · [Components](components.md) · [Icons](icons.md) · [Data and maps](data-and-maps.md)

Version 1.0.0 supplies a design reference and reusable assets. It does not automatically style the minimal Studio scaffold in `frontend/` or change a scientific API. `backend/` contains future-service guidance only; legacy code is retained in Git history. Adopt the theme in a reviewed interface increment with the relevant application's own checks.

## Package boundaries

The canonical package is [`design/pocket-cad/`](../../design/pocket-cad/README.md). Studio owns UI tokens, scoped styles, fonts and identity artwork. The handbook owns scientific visual conventions. Each package owns its own renderer and application adapters.

The asset filenames, `--epsm-*` custom properties, `.epsm-pocket-cad` scope and `.pc-*` utility/component names are the public visual interface for v1. Token changes require a version and release note; regenerate derived outputs instead of editing them separately. Do not describe this asset directory as an npm or Python package.

| Asset | Integration rule |
| --- | --- |
| `tokens.json` | Canonical visual values; change here and regenerate CSS |
| `tokens.css` | Generated variables, scoped to the theme root |
| `theme.css` | Opt-in component styles; no automatic application import |
| `maps.json` | Generated framework-neutral overlay roles; a map adapter implements them |
| `tokens.manifest.json` | Generated version and hashes for token exports |
| `preview-data.js` | Generated local token/icon data for the offline specimen |
| `fonts/` | Local font files, upstream versions and OFL licences |
| `icons/` | Native sources, exports, catalogue and hash manifest |
| `preview.html`, `preview.js` | Offline demonstration and interactions; no application services |

## Start with one screen

1. Choose one bounded view, such as a material table and its inspector. Preserve its data contracts, sources, units and keyboard order.
2. Copy or bundle the versioned package inside that application's build. Load `tokens.css` before `theme.css`, preserving the relative font URLs.
3. Add `.epsm-pocket-cad` to the new view's root. Apply semantic classes and attributes deliberately; do not introduce global overrides for unrelated styles.
4. Add local icons and label them correctly. Keep the current navigation item distinguishable from the red element already inside the artwork.
5. Check the view with real content, missing data, long labels, failed requests and keyboard navigation. New map adapters must first establish [explicit geometry roles](data-and-maps.md#geometry-roles-before-colours).

```html
<!-- Example after copying the package to /assets/pocket-cad/. -->
<link rel="stylesheet" href="/assets/pocket-cad/tokens.css">
<link rel="stylesheet" href="/assets/pocket-cad/theme.css">

<main class="epsm-pocket-cad" id="main">
  <h1>Component analysis</h1>
  <p>Model-derived material quantities.</p>
</main>
```

The wrapper isolates styling; it does not provide state management, persistence, routing, geometry validation or accessible tab behaviour. Keep those responsibilities in the owning application. Preserve installed package versions and scientific assumptions when changing presentation.

## Update repository identities

Each root README uses its own local image files in `docs/assets/brand/`. Distribute the light and dark icon together with their origin version and hashes. Preserve the plain project title, a short description of its actual role and the platform overview link.

Do not replace working installation examples or scientific limitations with marketing copy. Retain unreleased/proposed status and compatibility-table generation markers. Studio's unfinished rebuild must stay clearly distinguished from planned capabilities; Viewer retains its unreleased status.

An icon refresh is complete only when the copies and provenance records agree with the canonical pack. A repository must not need a sibling checkout, a live raw-GitHub image request or a local absolute path to display its introduction.

## Review before adoption

| Check | Acceptance |
| --- | --- |
| Identity | Right repository icon; original aspect ratio; readable at 32 px |
| Content | Clear title and next action; visible units, basis, assumptions and source |
| Colour | Artwork, interaction and science have separate meanings; labels supplement colour |
| Contrast | Normal text ≥4.5:1; meaningful graphics/controls ≥3:1 against adjacent colours |
| Keyboard | Visible focus, logical order, skip route and operable controls; no keyboard trap |
| Reflow | Usable at desktop and 320 CSS px; content survives 200% text enlargement |
| States | Empty, loading, selected, focused, invalid, failed and disabled states remain understandable |
| Maps | Role IDs precede palette changes; attribution, bounds and named drawing tools remain accessible |
| Offline | Specimen and local identities load with the network disabled; fonts have fallbacks |
| Provenance | Asset version, source changes, generated outputs, font licences and hashes agree |

For the specimen itself, open the local HTML at desktop and narrow widths, tab through every interactive element, zoom text and verify focus against every surface. Use actual screenshots to review layout; a passing file check is not a visual review.

## Reproducible updates

Use the commands in the [asset package README](../../design/pocket-cad/README.md). Check generated output without rewriting it during review. When adding a new identity, update native source, exports, manifest, catalogue and repository copies together. Review at 32 px before considering larger presentations.

With all twelve repositories checked out under the same parent, synchronize the README assets from the Studio root:

```sh
python3 design/pocket-cad/scripts/sync_readme_assets.py
python3 design/pocket-cad/scripts/sync_readme_assets.py --check
```

Use `--workspace-root /path/to/siblings` for another checkout location or `--repos epsm_core epsm_data` for a named subset. The distribution step needs those checkouts; the resulting repository assets do not. Review each repository's copied files and manifest before committing.

Fonts remain local and versioned; an upstream release is not an automatic update. Include the exact upstream version, source URL and licence for a changed binary. Keep the scientific palette's originating version with renderer adapters and agree changes with the handbook owner.

Dark-background README icons do not establish dark-mode colours. A future dark application theme needs its own text, focus, component, data and map review rather than inverting the light theme.
