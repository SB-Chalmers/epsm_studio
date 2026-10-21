# Pocket CAD fonts

These are the actual self-hosted webfonts used by the design reference. They work
offline after cloning the repository. No font service, package installation or
font build is needed.

Use **Inter** for interface text, headings, labels and readable numbers. Use
**IBM Plex Mono** for code, identifiers and compact technical readouts. The retro
character comes from the icons and grid; body text stays clear and contemporary.

## Sources and licenses

The four WOFF2 files and both license notices are unmodified copies from the
official upstream repositories. Their precise URLs, revisions, byte sizes and
SHA256 identities are retained in [manifest.json](manifest.json).

| Files | Official source | License |
| --- | --- | --- |
| `InterVariable.woff2`, `InterVariable-Italic.woff2` | [Inter v4.1](https://github.com/rsms/inter/tree/e3a3d4c57d5ecc01453a575621882a384c1995a3/docs/font-files), commit `e3a3d4c57d5ecc01453a575621882a384c1995a3` | [Original Inter OFL notice](INTER-OFL.txt) |
| `IBMPlexMono-Regular.woff2`, `IBMPlexMono-Medium.woff2` | [IBM Plex Mono 2.5.0](https://github.com/IBM/plex/tree/71f558992315a12ca1f06a2215d57962a1992162/packages/plex-mono), commit `71f558992315a12ca1f06a2215d57962a1992162` | [Original IBM Plex OFL notice](IBM-PLEX-OFL.txt) |

The fonts use the **SIL Open Font License 1.1**; the repository's MIT license does
not replace their font licenses. Keep both OFL notices with redistributed copies.
Upstream internal font-version strings differ from package labels: Inter reports
`4.001` under release tag `v4.1`, and Plex reports `2.005` under package `2.5.0`.
Both forms are recorded in the manifest.

Inter supplies normal and italic variable faces with weights 100–900 and an
optical-size axis of 14–32. Plex Mono supplies normal faces at weights 400 and 500.
The [reference theme](../theme.css) declares these local files with
`font-display: swap`, so text remains visible while a face loads. Preserve the
relative `fonts/` directory when copying that theme, or adjust its URLs explicitly.

## Scientific text and fallback

Both Inter files cover Swedish `ÅÄÖåäö`, superscripts `²³`, subscript `₂`, Greek
`μ`, the micro sign `µ` and `°C`. Both Plex Mono files cover the same sample except
Greek mu `μ` (`U+03BC`). Keep bundled Inter immediately after Plex Mono in the
monospace stack so this character has a local fallback:

```css
font-family: "IBM Plex Mono", Inter, ui-monospace, monospace;
```

The distinct micro sign `µ` (`U+00B5`) exists in Plex Mono. Keep the character
appropriate to the scientific text; do not replace `μ` just to avoid fallback.
Other scripts and symbols can use the system fallbacks in the design tokens.

Coverage was checked against the Unicode character maps of all four bundled
files. The sample and missing characters are recorded per file in the manifest.
The binary headers also identify every face as WOFF2 (`wOF2`).

## Verify or restore

From this directory, verify the vendored files offline with Python's standard
library:

```sh
python3 - <<'PY'
from pathlib import Path
import hashlib
import json

manifest = json.loads(Path("manifest.json").read_text())
for item in manifest["files"]:
    data = Path(item["file"]).read_bytes()
    assert hashlib.sha256(data).hexdigest() == item["sha256"], item["file"]
    assert len(data) == item["size_bytes"], item["file"]
    if item["kind"] == "font":
        assert data[:4] == b"wOF2", item["file"]
print("Verified four WOFF2 files and two original OFL licenses")
PY
```

To restore a missing copy, download its exact `source_url` from the manifest and
check its recorded SHA256 before replacing the local file. Those URLs name fixed
commits. Restoring requires network access; everyday use and verification do not.
For an intentional upstream update, select a new fixed release, retain its
original licenses, repeat the glyph check and update the manifest together.
