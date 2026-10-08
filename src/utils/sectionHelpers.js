// src/utils/sectionHelpers.js
export function isSectionLabel(line) {
  return /^\[.+\]$/.test(line.trim());
}

export function labelText(line) {
  return line.trim().replace(/^\[|\]$/g, "");
}

export const SECTION_PRESETS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Post-Chorus",
  "Bridge",
  "Refrain",
  "Interlude",
  "Instrumental",
  "Tag",
  "Vamp",
  "Outro",
  "Ending",
];
