# Data presentation and maps

[Manual](README.md) · [Foundations](foundations.md) · [Components](components.md) · [Icons](icons.md) · [Adoption](adoption.md)

The interface should help a reader explain a result, not just notice it. Keep quantities, evidence and assumptions visible, and separate visual selection from scientific meaning.

## Quantities and evidence

- Write the quantity and its unit together: `Total volume · m³`, `Energy · kWh/m²`, `Runtime · s`. Define the denominator and reporting period before presenting normalized energy.
- Use consistent precision within a comparison. Right-align table values and use tabular numerals; precision is a display choice, not evidence of measurement accuracy.
- Show missing values as “Not available”, with a reason where known. A dash needs an explanatory legend. Never turn missing data into zero.
- Keep reported, derived and assumed values distinguishable. Name the source and method, and retain conflicting evidence rather than silently choosing a convenient value.
- Describe derived stock quantities accurately: volume follows assigned construction area and material thickness; mass also depends on density. A total is not necessarily measured stock.
- Keep run identity, engine, input revision, failures and exclusions with a result. “Run completed” reports execution, not agreement with a real building.

A summary value such as **282.2 kWh/m²** needs a reporting period, an area basis and the relevant input/run identity in the surrounding view. The reference mockup values are illustrative content from the reviewed screens, not validation data.

## Scientific colours remain with the handbook

The [handbook plotting guide](https://github.com/SB-Chalmers/epsm_development/blob/main/docs/plotting-and-previews.md) and its [versioned palette](https://github.com/SB-Chalmers/epsm_development/blob/main/docs/assets/epsm-colours.json) own scientific encodings. At this manual's baseline, that palette is `draft-1`, explicitly a proposed convention; do not claim that every package already adopts it.

| Meaning | Handbook colour | Additional cue |
| --- | --- | --- |
| Source observation | Blue `#0072B2` | Source label and circle marker |
| Derived value | Orange `#E69F00` | “Derived” label and triangle marker |
| Assumed value | Purple `#CC79A7` | “Assumed” label and dashed line |
| Missing or not loaded | Gray `#6B7280` | Gap, outline or hatch and reason |
| Conflict or failed execution | Vermilion `#D55E00` | Cross marker and a specific status label |
| Passed software check | Green `#009E73` | Named check; no claim of scientific accuracy |

These colours encode data when paired with the stated cues. They are not interchangeable UI text colours and do not all meet text contrast requirements on paper. Keep legends in ink and use swatches or markers beside them.

Do not reinterpret Pocket CAD's selection red `#E9543F` as the handbook's failure colour. A selected failed run can carry both a selection outline and a clearly labelled failed-status marker. When multiple meanings appear, use separate channels: a material's fill can show class while a labelled outline identifies assumed geometry.

Package renderers should use a versioned local adapter or installed shared asset. Never load the handbook's sibling directory at runtime. Resolve a scientific palette change with its owner instead of changing it in the Studio theme.

## Charts

Prefer horizontal bars when labels are long. Use a quiet grid and ink axes with units. A single-comparison chart may use neutral marks with one selected item in red; categorical or provenance charts use their declared scientific legend instead.

For continuous quantities, start with the handbook's `cividis` sequential map. For signed differences, use its `RdBu_r` diverging map centred on a meaningful reference, usually zero. Keep a colourbar, units, limits and clipping visible. Comparisons must use the same limits; missing values need their own representation.

State aggregation explicitly: “Daily means from 8,760 hourly samples” differs from “Hourly data”. Show missing intervals and the number of successful and failed cases. Do not smooth away failures or interpolate unreported periods without an explicit method.

Provide a readable table or export for the underlying values. A chart's hover tooltip should add detail, not hold the only copy of a unit, source or essential result.

## Maps

A map helps define context and target geometry. The legend, inspector and keyboard-accessible list must explain those roles without depending on fill colour.

### Basemaps and attribution

Use a quiet street/light basemap by default, with readable labels and enough contrast to recognise place. Satellite and terrain are optional views. Keep provider attribution and licences visible and operable, including in exports when required. Do not hide attribution behind the inspector or drawing toolbar.

Raster tiles are already rendered images. **CSS cannot change individual road, water, park or label colours inside a raster tile.** A page-wide saturation or opacity filter also changes all those features and may reduce label contrast. Use the provider's supported neutral tile style, or a licensed vector style with explicit layer rules, rather than implying that CSS tokens restyle a raster basemap.

This asset pack does not ship a tile service, access token or a licensed replacement basemap. The [map presets](../../design/pocket-cad/maps.json) describe EPSM overlays and recommended basemap roles, not a functioning map adapter.

### Geometry and state

| Role or state | Appearance | Required companion |
| --- | --- | --- |
| Context/download area | Charcoal dashed boundary, quiet transparent fill | “Context area” label and area value |
| Target/study area | Charcoal solid boundary | “Simulation targets” label and area value |
| Selected geometry | Vermilion boundary above a contrasting white casing | Selected label in inspector; edit handles when editing |
| Hover | Thicker boundary without changing the role | Pointer feedback; equivalent list focus behaviour |
| Invalid geometry | Contrasting boundary, hatch/pattern and visible error marker | Specific reason and correction route |

Draw casing first and the coloured selection above it. A white casing helps isolate a red boundary from a busy map, but inspect both edges against actual tiles. Keep context dashes and target solid lines visible when selected. If a map backend cannot preserve both, retain an explicit role label and role-specific handle or line pattern.

Pattern fill is an adapter responsibility: render a real hatch layer or pattern in the chosen map backend. A generic JSON property does not implement hatching. Geometry validity must come from the model/validation result, never from its rendered colour.

Only draw interactive edit handles for the active editable shape. Use square or otherwise distinct handles with a contrasting centre, and keep their hit areas comfortably operable. Give rectangle, polygon, pan, edit and clear tools accessible names, keyboard focus and a visibly pressed state. Never clear geometry when merely changing the basemap.

Use ink/dark-red labels on a paper panel instead of putting small red text directly over tiles. Keep a scale, units and a labelled “Show bounds” route. Coordinates and area values must remain inspectable without hover.

### Geometry roles before colours

The rebuild has no map implementation yet. Give each editable geometry a stable
ID and an explicit role such as `context` or `target` before adopting these visual
presets. Colours are presentation, not the authority for a geometry's role.

1. Preserve IDs and roles through drawing, serialization, edit and reload.
2. Resolve edits through those values. Test distinct layers with the same display
   colour so visual changes cannot redirect an edit to another role.
3. Apply the visual preset from the role and interaction state. Verify selection,
   containment, invalid geometry, editing, export and clear behaviour independently
   of the palette.

The removed legacy map inferred some roles from colours. Use that as a lesson for
the new adapter, not a requirement to migrate legacy code or data. Copying the
overlay colours alone does not implement role metadata or geometry validation.

### Review the reference carefully

The [area-selection mockup](images/area-selection.png) shows the intended composition. Its red target polygon is selected; red is not the target role's permanent colour. Unselected targets use solid ink, context uses dashed ink, and the inspector names both. Future implementation must retain this distinction in selection and editing states.
