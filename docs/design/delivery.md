# Pocket CAD v1 delivery

The [manual](README.md) and [offline specimen](../../design/pocket-cad/preview.html)
are the entry points for the reusable visual system. This delivery adds assets and
documentation; application adoption remains a separate increment.

## Repository changes

Every repository below has a local light/dark identity pair, an MIT licence,
a version/hash manifest and a root README introduction with its purpose and
platform link. Existing technical instructions and limitations are retained.

| Repository | Additional delivery |
| --- | --- |
| `epsm` | Illustrated twelve-package platform overview, task entry links, calculation flow and complete README icon directory |
| `epsm_core` | Physical-building introduction |
| `epsm_data` | Materials, construction and operating-definition introduction |
| `epsm_db` | Building evidence and source-tracing introduction |
| `epsm_rc` | Reduced thermal-model introduction |
| `epsm_lca` | Declared material, energy and renovation climate-assessment introduction |
| `epsm_workflows` | Experiment design and repeatable execution introduction |
| `epsm_studies` | Protocol, comparison and study-evidence introduction |
| `epsm_development` | Engineering handbook and contribution introduction |
| `epsm_viewer` | Geometry inspection introduction, retaining unreleased status |
| `epsm_studio` | Six-part design manual, three UI references, native icon kit, self-hosted fonts, generated tokens, scoped CSS, map presets and interactive specimen |
| `smhi2epw` | Weather-file and source-provenance introduction; matching weather identity |

## Verification

- Twelve native 32×32 icons, 24 SVG exports, 120 PNG exports and both contact sheets
  agree with their source grids. The icon build checks 149 deterministic files.
- Token/CSS/map exports, palette agreement, font headers and SHA256 manifests,
  OFL licences, contrast thresholds and local document references pass the asset checks.
- All 46 distributed README images across twelve repositories match the canonical
  pack and their local provenance manifests.
- Eight validator tests check rejection of faint text, unscoped CSS, missing files
  and machine-specific references as well as accepted scoped examples.
- EPSM's generated compatibility table check passes. The development handbook's
  documentation checker, eleven unit tests and two offline example notebooks pass.
- Browser checks cover field validation, keyboard tabs, labelled selection toggles,
  disabled-action explanations and locally served fonts. The specimen includes a
  100%/200% text-size control for repeatable enlarged-text review.

Re-run the commands in the [asset README](../../design/pocket-cad/README.md) after
editing source assets. `--check` commands verify without rewriting files.

Studio was also being restructured in the shared checkout during this delivery.
The manual follows its current minimal `frontend/` scaffold and preserves the
separate rebuild work. No theme imports, deployments, commits or pushes are
performed by this design-system delivery.
