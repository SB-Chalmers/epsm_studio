# Components and interaction

[Manual](README.md) · [Foundations](foundations.md) · [Icons](icons.md) · [Data and maps](data-and-maps.md) · [Adoption](adoption.md)

Use ordinary HTML semantics before adding visual classes. The [offline specimen](../../design/pocket-cad/preview.html) demonstrates the opt-in theme; these classes are a starting stylesheet, not a replacement for application behaviour or an accessible component library.

## Page structure

Start each screen with one clear page title and a short statement of what the user can do. Put the current project or study in the shared header. Keep the global navigation separate from page-level tabs. Use a quiet summary row for important quantities instead of placing every metric in its own card.

An inspector should answer three questions in order: **What is selected? Where did its values come from? What can I do with it?** Keep stable identifiers and sources available without overwhelming the default view. On a small screen, place the inspector after the selected content or open it with a named control, and return focus when it closes.

## Buttons and links

Use one charcoal primary action per task group: “Fetch area”, “Run baseline” or “Download results”. Secondary actions use a light surface and a strong border. Links navigate; buttons change state or perform an action. Prefer explicit labels over “OK” or “Submit”.

Reserve vermilion for a selection marker. Destructive actions need a specific label such as “Remove target area” and a consequence explained near the action. Do not turn all calls to action red.

```html
<div class="epsm-pocket-cad">
  <div class="pc-row">
    <button class="pc-button pc-button--primary" type="button">
      Fetch area
    </button>
    <button class="pc-button" type="button">Validate selection</button>
  </div>
</div>
```

Show the action's progress in place: “Fetching buildings…”, followed by the result or a specific retryable error. Prevent duplicate submissions while work is pending, but do not hide the current request or discard the user's input.

## Forms

Put a visible label above each input. Keep units in the label or an adjacent persistent suffix, not just in placeholder text. Place a concise explanation below the label or field. State required fields consistently; do not rely only on a red asterisk.

```html
<div class="epsm-pocket-cad">
  <div class="pc-field">
    <label for="floor-area">Floor area (m²)</label>
    <input class="pc-input" id="floor-area" name="floor-area"
      type="number" min="0" step="any" aria-describedby="floor-area-help">
    <p id="floor-area-help">State the area basis used for normalization.</p>
  </div>
</div>
```

For an invalid field, preserve its value, set `aria-invalid="true"`, associate a specific error using `aria-describedby` and show a visible “Error” label or marker. For example: “Floor area must be greater than zero to calculate kWh/m².” If several fields fail, provide a focusable error summary linking to each field. A border change alone is insufficient.

Use the real disabled attribute only when an action cannot be taken. Explain why nearby. Do not reduce essential instructions to low-opacity text.

## Navigation and tabs

Show the current navigation item using ink, a quiet background and a leading rule, with `aria-current="page"` on its link. A selected page is not a red error state.

Use a red underline with dark-red text for the active page-level data view. Navigation links can look like tabs without adopting the ARIA tab pattern:

```html
<div class="epsm-pocket-cad">
  <nav class="pc-tabs" aria-label="Result views">
    <a class="pc-tab" href="summary.html">Summary</a>
    <a class="pc-tab" href="hourly.html" aria-current="page">Hourly data</a>
  </nav>
</div>
```

For panels switched without navigation, implement the complete tab pattern: `tablist`, `tab`, `tabpanel`, `aria-selected`, related IDs and arrow-key navigation. CSS does not implement that behaviour. Keep the active view in the URL when it must survive refresh or be shared.

## Tables and quantities

Use real tables for comparable records, a caption explaining the basis, and column headers with units. Left-align names and right-align numeric columns. Use tabular Inter numerals with consistent decimal precision within a column. Keep a source or assumption label with its value.

```html
<div class="epsm-pocket-cad">
  <table class="pc-table">
    <caption>Annual simulated energy · illustrative values</caption>
    <thead><tr><th scope="col">Case</th><th scope="col">Energy (kWh/m²)</th></tr></thead>
    <tbody><tr><th scope="row">Baseline</th><td class="pc-number">282.2</td></tr></tbody>
  </table>
</div>
```

Sorting controls belong inside headers and must expose the sort direction. A selected row needs an explicit selection control or clear label; a red background is insufficient. Keep selection distinct from a validation or execution status in another column.

## Empty, loading and error states

| State | Say | Show or offer |
| --- | --- | --- |
| No study yet | “No study created” | A short explanation and “Create study” |
| No matches | “No materials match these filters” | Active filters and a way to clear them |
| Loading | “Loading 18 of 42 records…” | Progress if known; otherwise a stable status label |
| Missing evidence | “Height unavailable for building B-014” | A reason, source status and explicit assumption route if supported |
| Failed run | “EnergyPlus stopped before results were written” | Retained logs, attempt identity and supported next action |
| Stale result | “Inputs changed after this run” | Input revision and a clear route to run again |

Use a polite live region for asynchronous updates and an alert only when immediate attention is needed. Do not announce every progress tick. A successful software check says what passed; it does not imply scientific accuracy.

```html
<div class="epsm-pocket-cad">
  <p class="pc-notice" role="status">
    <strong>Selection checked.</strong> All targets lie inside the context area.
  </p>
</div>
```

## Icons within controls

Use a 32 px repository identity beside a section or project name. Simple action glyphs may be smaller, but they must follow the same charcoal weight and avoid competing red details. The repository pack is not an exhaustive set of action icons. Do not repurpose a report icon to mean “delete”, or a database icon to mean “save”.

For an icon next to a visible label, use empty alternative text. For an icon-only button, name the button, not the decorative image. Keep a tooltip optional; it cannot be the only accessible name.

```html
<button class="pc-button" type="button" aria-label="Open material record">
  <img class="pc-icon" src="icons/svg/epsm_data.svg" width="32" height="32" alt="">
</button>
```

The paths in component snippets are illustrative application paths. Copy the assets and choose repository-local URLs during integration; see [adoption](adoption.md).
