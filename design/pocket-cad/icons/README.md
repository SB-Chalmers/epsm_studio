# EPSM Pocket CAD icons

Original native **32 × 32** pixel artwork for the EPSM repository family and
SMHI to EPW. The approved Pocket CAD reference established the visual direction;
these editable grids were drawn independently rather than cropped or traced
from a presentation image. Attribution: **EPSM contributors**. [MIT licence](LICENSE).

Open [the catalogue](catalogue.html) to inspect native and 4× previews on light
and dark backgrounds. Static contact sheets are available for
[light](contact-sheet.png) and [dark](contact-sheet-dark.png) backgrounds.

## Source and regeneration

`source.json` is the canonical artwork: twelve 32-row grids, each containing
exactly 32 palette symbols per row. `.` means transparent; `I` ink, `C` cream,
`T` stone, `S` shade and `R` the active red item. Keep a two-pixel transparent
margin so the optional dark-background keyline fits within the same canvas.
Edit these native grids, then rebuild. Exported SVG paths contain only integer
pixel runs; they are not smoothed vector approximations.

From the Studio repository root, using Python 3 and its standard library:

```sh
python3 design/pocket-cad/scripts/build_icons.py
python3 design/pocket-cad/scripts/build_icons.py --check
```

`--check` writes nothing. It validates source dimensions, IDs, palette, safe
padding, preservation of original pixels in the dark variant, and the open
dielectric gap in the RC capacitor. It then compares every generated output
byte-for-byte and checks for unexpected SVG/PNG exports.

## Exports

- `svg/<id>.svg`: accessible standalone SVG, native 32-pixel view box.
- `svg/dark/<id>.svg`: the same pixels with a one-pixel cream keyline.
- `png/{32,64,128,256,512}/<id>.png`: transparent nearest-neighbour exports.
- `png/dark/{32,64,128,256,512}/<id>.png`: dark-background counterparts.
- `sprite.svg`: light symbols named `<id>` and dark symbols `<id>-dark`.
- `manifest.json`: version `1.0.0`, source hashes and export SHA-256 hashes.

Every path inside the manifest resolves relative to **this `icons/` directory**.
Each `icons[]` entry provides `id`, `label`, `role`, `sourcehash`, `files` and
`filehashes`. `sourcehash` includes that icon's complete entry and the palette;
`source_file_sha256` covers the exact source file. `packfiles` covers the sprite,
catalogue and contact sheets. The manifest does not hash itself.

Use 32, 64 or another integer multiple of 32 CSS pixels for crisp rendering.
Set `image-rendering: pixelated` when a browser scales PNGs. Keep informative
alternative text on images; mark decorative images empty when their visible
label already supplies the same meaning. Use each repository name in text next
to navigation icons. The red element communicates selection within the artwork;
it is not a simulation result or error indication.

## Meaning

| ID | Metaphor |
| --- | --- |
| `epsm` | Open building cell; active inner wall |
| `epsm_core` | The same physical cell; active base |
| `epsm_data` | Material and assumption panels; active middle panel |
| `epsm_db` | Stored records in three drawers; active record label |
| `epsm_rc` | Resistor to active junction and output; capacitor branch to ground |
| `epsm_lca` | Assessed material block inside a lifecycle loop |
| `epsm_workflows` | Linked modelling stages; active middle stage |
| `epsm_studies` | Study report with a highlighted result bar |
| `epsm_development` | Open engineering handbook; active right page |
| `epsm_studio` | Workspace window containing the building cell |
| `epsm_viewer` | Inspection lens containing the same cell |
| `smhi2epw` | Weather calendar and cloud; active sample day |

Application styling is opt-in elsewhere in the design kit. Building this pack
does not import it into the Studio frontend or change its appearance.
