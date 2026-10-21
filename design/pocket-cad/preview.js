/* SPDX-License-Identifier: MIT · Local specimen interactions; no network/storage. */
"use strict";
const specimen = window.EPSM_POCKET_CAD;
document.getElementById("text-size").addEventListener("change", event => {
  document.documentElement.style.fontSize = `${event.target.value}%`;
});
const colourKeys = ["color-background", "color-text", "color-muted", "color-divider", "color-border", "color-selection", "color-selection-text", "color-focus"];
for (const key of colourKeys) {
  const card = document.createElement("div");
  const swatch = document.createElement("div");
  swatch.className = "specimen-swatch";
  swatch.style.backgroundColor = specimen.tokens[key];
  swatch.setAttribute("aria-hidden", "true");
  const label = document.createElement("strong");
  label.textContent = key.replace("color-", "").replaceAll("-", " ");
  const value = document.createElement("p");
  value.className = "pc-code pc-muted";
  value.textContent = specimen.tokens[key];
  card.append(swatch, label, value);
  document.getElementById("ui-colours").append(card);
}
for (const icon of specimen.icons) {
  const article = document.createElement("article");
  article.className = "specimen-icon";
  const img = document.createElement("img");
  img.src = `icons/png/64/${icon.id}.png`;
  img.alt = ""; img.width = 64; img.height = 64;
  const link = document.createElement("a");
  link.href = `icons/svg/${icon.id}.svg`; link.textContent = icon.label;
  const description = document.createElement("small"); description.textContent = icon.role;
  article.append(img, link, description);
  document.getElementById("icon-grid").append(article);
  const dark = document.createElement("img");
  dark.src = `icons/png/dark/32/${icon.id}.png`; dark.alt = icon.label; dark.width = 32; dark.height = 32;
  document.getElementById("dark-icon-row").append(dark);
}
const nameField = document.getElementById("study-name");
const error = document.getElementById("study-error");
const result = document.getElementById("form-result");
document.getElementById("example-form").addEventListener("submit", event => {
  event.preventDefault();
  const valid = nameField.value.trim().length > 0;
  error.hidden = valid; nameField.setAttribute("aria-invalid", String(!valid));
  result.textContent = valid ? "Example input valid. No project was saved." : "Example input needs a study name.";
  if (!valid) nameField.focus();
});
document.getElementById("reset-example").addEventListener("click", () => {
  nameField.value = "Campus study"; nameField.removeAttribute("aria-invalid");
  error.hidden = true; result.textContent = "Example reset."; nameField.focus();
});
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(tab, focus = false) {
  for (const candidate of tabs) {
    const active = candidate === tab;
    candidate.setAttribute("aria-selected", String(active)); candidate.tabIndex = active ? 0 : -1;
    document.getElementById(candidate.getAttribute("aria-controls")).hidden = !active;
  }
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", event => {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); selectTab(tabs[next], true); }
  });
});
function updateSelection() {
  const selected = document.getElementById("select-heating").checked;
  // Native table rows are not an ARIA grid: convey selection with the labelled
  // checkbox, a data attribute for styling and the live description.
  document.getElementById("heating-row").dataset.selected = String(selected);
  document.getElementById("selection-description").textContent = selected ? "Selected: Heating · 199.8 kWh/m²." : "No result selected.";
}
document.getElementById("select-heating").addEventListener("change", updateSelection);
updateSelection();
document.getElementById("map-selection").addEventListener("change", event => {
  const selected = event.target.checked;
  document.getElementById("map-target").dataset.selected = String(selected);
  document.getElementById("map-schematic").setAttribute("aria-label", `Schematic: dashed context boundary surrounding a solid target boundary${selected ? '; selected target uses red and a white casing' : '; target is not selected'}.`);
  document.getElementById("map-description").textContent = selected ? "Target selected. Context and target roles are stored separately from styling." : "Target not selected. Its solid boundary still identifies its role.";
});
