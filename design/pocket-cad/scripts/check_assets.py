#!/usr/bin/env python3
"""Verify Pocket CAD assets without modifying a checkout (Python standard library).

SPDX-License-Identifier: MIT
Copyright (c) 2026 EPSM contributors

Default checks cover the local kit and its manual. --check-readmes explicitly
adds cross-repository copy verification; it only invokes the sync helper with
--check. --self-test runs in-memory negative tests instead of checking assets.
"""
from __future__ import annotations

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import struct
import subprocess
import sys
import unittest
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = ROOT.parents[1]
MANUAL = REPOSITORY / "docs" / "design"
VERSION = "1.0.0"
SCOPE = ".epsm-pocket-cad"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def contrast(first: str, second: str) -> float:
    def luminance(value: str) -> float:
        require(bool(re.fullmatch(r"#[0-9a-fA-F]{6}", value)), f"Expected an opaque six-digit colour: {value!r}")
        channels = [int(value[index:index+2], 16) / 255 for index in (1, 3, 5)]
        linear = [part/12.92 if part <= .04045 else ((part+.055)/1.055)**2.4 for part in channels]
        return sum(part*weight for part, weight in zip(linear, (.2126, .7152, .0722)))
    lighter, darker = sorted((luminance(first), luminance(second)), reverse=True)
    return (lighter+.05)/(darker+.05)


def check_contrast(tokens: dict[str, str]) -> list[str]:
    results = []
    checks = [(name, 4.5) for name in ("text", "muted", "selection-text", "success", "warning", "danger", "info")]
    checks += [(name, 3.0) for name in ("border", "focus", "selection")]
    for background in ("background", "surface"):
        for name, minimum in checks:
            ratio = contrast(tokens[f"color-{name}"], tokens[f"color-{background}"])
            require(ratio >= minimum, f"{name} on {background}: {ratio:.2f}:1 is below {minimum}:1")
            results.append(f"{name}/{background} {ratio:.2f}:1")
    for name in ("text", "muted", "selection-text"):
        ratio = contrast(tokens[f"color-{name}"], tokens["color-selection-surface"])
        require(ratio >= 4.5, f"{name} on selected surface: {ratio:.2f}:1 is below 4.5:1")
    return results


def separated(value: str, delimiter: str = ",") -> list[str]:
    """Split a CSS prelude without splitting :where(a,b), attributes or strings."""
    result, start, depth, quote = [], 0, 0, None
    for index, char in enumerate(value):
        if quote:
            if char == quote and (index == 0 or value[index-1] != "\\"):
                quote = None
        elif char in "\"'":
            quote = char
        elif char in "([":
            depth += 1
        elif char in ")]":
            depth -= 1
        elif char == delimiter and depth == 0:
            result.append(value[start:index].strip())
            start = index+1
    result.append(value[start:].strip())
    return result


def css_blocks(css: str):
    """Read CSS block structure; this deliberately rejects unsupported at-rules."""
    position = 0
    while position < len(css):
        while position < len(css) and css[position].isspace():
            position += 1
        if position == len(css):
            return
        start, quote, parentheses = position, None, 0
        while position < len(css):
            char = css[position]
            if quote:
                if char == quote and css[position-1] != "\\":
                    quote = None
            elif char in "\"'":
                quote = char
            elif char == "(":
                parentheses += 1
            elif char == ")":
                parentheses -= 1
            elif parentheses == 0 and char in "{;":
                break
            position += 1
        require(position < len(css), "CSS contains an incomplete rule")
        prelude = css[start:position].strip()
        require(css[position] == "{", f"Unscoped or unsupported CSS statement: {prelude}")
        position += 1
        body_start, depth, quote = position, 1, None
        while position < len(css) and depth:
            char = css[position]
            if quote:
                if char == quote and css[position-1] != "\\":
                    quote = None
            elif char in "\"'":
                quote = char
            elif char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            position += 1
        require(depth == 0, f"Unclosed CSS block: {prelude}")
        yield prelude, css[body_start:position-1]


def check_scoped_css(css: str) -> None:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    for prelude, body in css_blocks(css):
        if prelude.lower() == "@font-face":
            require("{" not in body, "Nested rules inside @font-face")
        elif re.match(r"^@(media|supports|container|layer)\b", prelude, re.I):
            check_scoped_css(body)
        else:
            require(not prelude.startswith("@"), f"Unsupported global at-rule: {prelude}")
            for selector in separated(prelude):
                require(bool(re.match(r"^\.epsm-pocket-cad(?=$|[\s.#\[:>+~])", selector)), f"Unscoped selector: {selector}")
                # A root-level sibling combinator could select outside the opt-in wrapper.
                root_sibling = re.match(r"^\.epsm-pocket-cad(?:\.[\w-]+|\[[^]]*\]|:{1,2}[\w-]+(?:\([^)]*\))?)*\s*[+~]", selector)
                require(not root_sibling, f"Selector escapes the theme wrapper: {selector}")
            require("{" not in body, f"CSS nesting requires explicit scope review: {prelude}")


def check_tokens() -> None:
    source = load(ROOT / "tokens.json")
    require(source["version"] == VERSION and source["schema_version"] == 1, "Expected v1 token schema")
    tokens = source["tokens"]
    for key, value in tokens.items():
        require(bool(re.fullmatch(r"[a-z][a-z0-9-]*", key)), f"Invalid token name: {key}")
        require(isinstance(value, str) and value and not re.search(r"[;{}<>]", value), f"Unsafe or empty CSS token: {key}")
        if key.startswith("color-"):
            require(bool(re.fullmatch(r"#[0-9a-fA-F]{6}", value)), f"Invalid colour token: {key}")
    css = (ROOT / "tokens.css").read_text(encoding="utf-8")
    declarations = re.findall(r"--epsm-([a-z0-9-]+)\s*:\s*([^;{}]+);", css)
    require(len(declarations) == len(tokens), "Token CSS has missing or duplicate declarations")
    require(dict(declarations) == tokens, "Token CSS values differ from their JSON source")
    check_scoped_css(css)
    theme = (ROOT / "theme.css").read_text(encoding="utf-8")
    check_scoped_css(theme)
    styles = [path.read_text(encoding="utf-8") for path in ROOT.rglob("*.css")]
    for path in ROOT.rglob("*.html"):
        document = References()
        document.feed(path.read_text(encoding="utf-8"))
        styles.extend(document.styles)
    used = set(re.findall(r"var\(\s*--epsm-([a-z0-9-]+)", "\n".join(styles)))
    require(used <= tokens.keys(), f"Unknown CSS token references: {sorted(used-tokens.keys())}")
    check_contrast(tokens)
    maps = load(ROOT / "maps.json")
    require(maps["version"] == VERSION and maps["units"] == "CSS pixels", "Map export version/units differ from the kit")
    for role in ("context", "target", "selected", "invalid"):
        preset = maps[role]
        require(bool(re.fullmatch(r"#[0-9a-fA-F]{6}", preset["color"])), f"Invalid map colour for {role}")
        for property_name in ("opacity", "fillOpacity"):
            if property_name in preset:
                require(isinstance(preset[property_name], (int,float)) and 0 <= preset[property_name] <= 1, f"Map {role}.{property_name} must be between 0 and 1")
        if "weight" in preset:
            require(isinstance(preset["weight"], (int,float)) and preset["weight"] > 0, f"Map {role}.weight must be positive")
    require(maps["context"]["dashArray"] and maps["target"]["dashArray"] is None, "Map roles must retain distinct dashed/solid boundaries")
    require(maps["selected"]["color"] == tokens["color-selection"] and maps["selected"]["casing"]["extraWeight"] > 0, "Selected geometry needs the selection token and a wider casing")
    require(maps["invalid"]["labelRequired"] is True and maps["invalid"]["pattern"], "Invalid geometry must have a label and pattern")


def check_fonts() -> None:
    directory = ROOT / "fonts"
    manifest = load(directory / "manifest.json")
    require(manifest["version"] == VERSION and manifest["hash_algorithm"] == "sha256", "Unexpected font manifest contract")
    names = set()
    font_count = license_count = 0
    for entry in manifest["files"]:
        path = (directory / entry["file"]).resolve()
        require(path.is_relative_to(directory.resolve()), f"Font path escapes its directory: {entry['file']}")
        require(entry["file"] not in names, f"Duplicate font-manifest file: {entry['file']}")
        names.add(entry["file"])
        data = path.read_bytes()
        require(len(data) == entry["size_bytes"], f"Font byte size differs: {path.name}")
        require(hashlib.sha256(data).hexdigest() == entry["sha256"], f"Font checksum differs: {path.name}")
        if entry["kind"] == "font":
            font_count += 1
            require(len(data) >= 48 and data[:4] == b"wOF2", f"Invalid WOFF2 signature: {path.name}")
            require(struct.unpack(">I", data[8:12])[0] == len(data), f"Invalid WOFF2 header length: {path.name}")
        elif entry["kind"] == "license":
            license_count += 1
            require(b"SIL OPEN FONT LICENSE" in data.upper(), f"Original OFL notice missing: {path.name}")
        else:
            raise ValueError(f"Unknown font-manifest kind: {entry['kind']}")
    require(font_count == 4 and license_count == 2, "Expected four fonts and both original OFL notices")
    require({path.name for path in directory.glob("*.woff2")} <= names, "Unlisted WOFF2 files are missing font provenance")
    fallback = manifest["glyph_fallback"]["fallback_family"]
    mono = load(ROOT / "tokens.json")["tokens"]["font-mono"]
    require(fallback in mono and mono.index("IBM Plex Mono") < mono.index(fallback), "Monospace stack must include bundled Inter after Plex Mono for Greek mu")


def check_icon_contract() -> None:
    tokens = load(ROOT / "tokens.json")
    manifest = load(ROOT / "icons" / "manifest.json")
    source = load(ROOT / "icons" / "source.json")
    require(manifest["version"] == source["version"] == tokens["version"] == VERSION, "Icon and token versions disagree")
    art = tokens["artwork_palette"]
    expected = {"I": art["ink"], "C": art["cream"], "T": art["stone"], "S": art["shade"], "R": art["active"]}
    require(source["palette"] == manifest["palette"] == expected, "Native icon palette differs from the canonical artwork palette")


class References(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.urls = []
        self.styles = []
        self.in_style = False

    def handle_starttag(self, tag, attributes):
        self.in_style = self.in_style or tag == "style"
        for key, value in attributes:
            if not value:
                continue
            if key in ("src", "href", "poster"):
                self.urls.append(value)
            elif key == "srcset" and not value.lstrip().startswith("data:"):
                self.urls.extend(item.strip().split()[0] for item in value.split(",") if item.strip())
            elif key == "style":
                self.styles.append(value)

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False

    def handle_data(self, data):
        if self.in_style:
            self.styles.append(data)


def css_urls(css: str) -> list[str]:
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    return [next(part for part in match if part) for match in re.findall(r"url\(\s*(?:\"([^\"]+)\"|'([^']+)'|([^\s)]+))\s*\)", css)]


def check_reference(owner: Path, raw: str) -> None:
    # Examples such as <id>.png or {package}/... are templates, not assets.
    if not raw.strip() or re.search(r"[<>{}]", raw):
        return
    parsed = urlsplit(raw)
    require(parsed.scheme != "file", f"Absolute file URL is not portable: {owner.name}: {raw}")
    if parsed.scheme or parsed.netloc or not parsed.path:
        return  # External sites, mail links, data URLs and fragments are not fetched.
    require(not parsed.path.startswith("/"), f"Root-relative reference is not portable offline: {owner.name}: {raw}")
    target = owner.parent / unquote(parsed.path)
    require(target.exists(), f"Missing local reference from {owner.relative_to(REPOSITORY)}: {raw}")


def without_code(markdown: str) -> str:
    result, fence = [], None
    for line in markdown.splitlines():
        match = re.match(r"^\s*(`{3,}|~{3,})", line)
        if match:
            if fence is None:
                fence = match[1][0]
            elif match[1][0] == fence:
                fence = None
            continue
        if fence is None:
            result.append(line)
    return re.sub(r"`+[^`\n]*`+", "", "\n".join(result))


def check_links(skip_docs: bool) -> None:
    require((ROOT / "preview.html").is_file(), "Offline specimen preview.html is missing")
    for path in sorted(ROOT.rglob("*.html")):
        parser = References()
        parser.feed(path.read_text(encoding="utf-8"))
        for raw in parser.urls + css_urls("\n".join(parser.styles)):
            check_reference(path, raw)
    for path in sorted(ROOT.rglob("*.css")):
        for raw in css_urls(path.read_text(encoding="utf-8")):
            check_reference(path, raw)
    if skip_docs:
        return
    require((MANUAL / "README.md").is_file(), "Design manual README is missing")
    for path in sorted(set(ROOT.rglob("*.md")) | set(MANUAL.rglob("*.md"))):
        content = without_code(path.read_text(encoding="utf-8"))
        references = re.findall(r"!?\[[^]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+['\"][^'\"]*['\"])?\s*\)", content)
        references += re.findall(r"^\s*\[[^]]+\]:\s*(?:<([^>]+)>|(\S+))", content, flags=re.M)
        for pair in references:
            check_reference(path, pair[0] or pair[1])
        parser = References()
        parser.feed(content)
        for raw in parser.urls:
            check_reference(path, raw)


def check_builder(script: str, extra: list[str] | None = None) -> None:
    command = [sys.executable, str(ROOT / "scripts" / script), "--check", *(extra or [])]
    result = subprocess.run(command, cwd=REPOSITORY, text=True, capture_output=True, check=False)
    require(result.returncode == 0, (result.stdout + result.stderr).strip() or f"{script} --check failed")
    if result.stdout.strip():
        print("  " + result.stdout.strip())


class NegativeTests(unittest.TestCase):
    def test_contrast_fails_for_faint_text(self):
        with self.assertRaisesRegex(ValueError, "below"):
            check_contrast({f"color-{name}": "#FFFFFF" for name in ("text", "muted", "selection-text", "success", "warning", "danger", "info", "border", "focus", "selection", "background", "surface", "selection-surface")})

    def test_known_contrast_values(self):
        self.assertAlmostEqual(contrast("#000000", "#FFFFFF"), 21)
        self.assertAlmostEqual(contrast("#FFFFFF", "#FFFFFF"), 1)

    def test_scoped_media_and_selector_lists_pass(self):
        check_scoped_css('@font-face { src:url("a.woff2"); } @media(max-width:700px){.epsm-pocket-cad :where(a,button), .epsm-pocket-cad .x {color:black}}')

    def test_unscoped_rules_fail(self):
        for css in ("body{margin:0}", ".epsm-pocket-cad button,button{color:red}", "@media(print){p{color:black}}", ".epsm-pocket-cadish{color:red}", ".epsm-pocket-cad + main{color:red}"):
            with self.subTest(css=css), self.assertRaises(ValueError):
                check_scoped_css(css)

    def test_missing_reference_fails(self):
        with self.assertRaisesRegex(ValueError, "Missing local reference"):
            check_reference(Path(__file__), "not-a-real-pocket-cad-asset.png")

    def test_machine_specific_file_urls_fail(self):
        with self.assertRaisesRegex(ValueError, "not portable"):
            check_reference(Path(__file__), "file:///tmp/imaginary.png")

    def test_external_and_template_references_are_not_fetched(self):
        for raw in ("https://example.invalid/unavailable#fragment", "#example", "<id>.png", "data:image/png;base64,AAAA"):
            check_reference(Path(__file__), raw)

    def test_snippet_paths_are_not_document_links(self):
        sample = '```html\n<img src="imaginary.png">\n```\n[Actual](../tokens.json)'
        self.assertNotIn("imaginary.png", without_code(sample))
        self.assertIn("../tokens.json", without_code(sample))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-docs", action="store_true", help="Skip Markdown link checks; still verify the offline specimen")
    parser.add_argument("--check-readmes", action="store_true", help="Also verify icon copies in all 12 sibling repositories (read-only)")
    parser.add_argument("--workspace-root", type=Path, help="Sibling-checkout parent, only used with --check-readmes")
    parser.add_argument("--self-test", action="store_true", help="Run in-memory positive/negative validator tests only; no writes")
    args = parser.parse_args()
    if args.self_test:
        return 0 if unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(NegativeTests)).wasSuccessful() else 1
    if args.workspace_root is not None and not args.check_readmes:
        parser.error("--workspace-root requires explicit --check-readmes")
    checks = [
        ("Token values, scoped CSS and contrast", check_tokens),
        ("Vendored fonts, licences and local glyph fallback", check_fonts),
        ("Icon/token version and artwork palette agreement", check_icon_contract),
        ("Icon export integrity", lambda: check_builder("build_icons.py")),
        ("Token export integrity", lambda: check_builder("build_tokens.py")),
        ("Local HTML, CSS and manual references", lambda: check_links(args.skip_docs)),
    ]
    if args.check_readmes:
        extra = ["--workspace-root", str(args.workspace_root)] if args.workspace_root else []
        checks.append(("Explicit workspace README copy integrity", lambda: check_builder("sync_readme_assets.py", extra)))
    failures = []
    for label, check in checks:
        try:
            check()
            print(f"PASS {label}")
        except (OSError, ValueError, KeyError, TypeError, IndexError) as error:
            failures.append(label)
            print(f"FAIL {label}: {error}", file=sys.stderr)
    if failures:
        print(f"{len(failures)} asset check(s) failed. No files were written.", file=sys.stderr)
        return 1
    print(f"Pocket CAD {VERSION}: {len(checks)} checks passed. No files were written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
