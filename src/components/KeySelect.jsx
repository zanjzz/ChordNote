// src/components/KeySelect.jsx
//
// Dropdown replacement for the free-text Key meta input. Emits the same
// plain key strings the rest of the app already understands ("G", "Bb",
// "Am", …), so transpose, Nashville/Roman conversion, and the sharp/flat
// toggle all keep working off `musicKey` unchanged.
//
// The accidental options shown follow the current sharp/flat preference:
// in sharp mode the list uses C#, D#, F#…; in flat mode it uses Db, Eb,
// Gb… — so the Key field stays consistent with the chord notation.

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

// Chromatic degrees that have two spellings. index = semitone (0=C).
// Naturals are the same in both modes; accidental notes switch spelling.
const SHARP_SPELLING = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
const FLAT_SPELLING = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

function majorKeys(pref) {
  return pref === "flat" ? FLAT_SPELLING : SHARP_SPELLING;
}
function minorKeys(pref) {
  return majorKeys(pref).map((k) => `${k}m`);
}

// Re-spell a key string into the preferred accidental so the <select>
// value always matches one of the listed options (e.g. value "Db" while
// in sharp mode is shown/normalized as "C#"). Preserves the minor "m".
const ENHARMONIC = {
  "C#": "Db",
  Db: "C#",
  "D#": "Eb",
  Eb: "D#",
  "F#": "Gb",
  Gb: "F#",
  "G#": "Ab",
  Ab: "G#",
  "A#": "Bb",
  Bb: "A#",
};

function respell(value, pref) {
  if (!value) return "";
  const m = value.match(/^([A-G][#b]?)(m?)$/);
  if (!m) return value;
  const root = m[1];
  const minor = m[2];
  const wantFlat = pref === "flat";
  const isFlat = root.includes("b");
  const isSharp = root.includes("#");
  // If the root's accidental already matches the preference (or it's a
  // natural), leave it. Otherwise swap to the enharmonic equivalent.
  if ((wantFlat && isSharp) || (!wantFlat && isFlat)) {
    const swapped = ENHARMONIC[root];
    if (swapped) return swapped + minor;
  }
  return value;
}

export default function KeySelect({
  theme,
  value,
  onChange,
  accidentalPreference = "sharp",
}) {
  const [isHovered, setIsHovered] = useState(false);
  const hoverBorder = isHovered ? theme.textSecondary : theme.border;

  const majors = majorKeys(accidentalPreference);
  const minors = minorKeys(accidentalPreference);
  const normalizedValue = respell(value, accidentalPreference);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        minWidth: 0,
      }}
    >
      <label
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: theme.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Key
      </label>
      <div style={{ position: "relative", minWidth: 0 }}>
        <select
          value={normalizedValue}
          onChange={(e) => onChange(e.target.value)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            width: "100%",
            padding: "6px 28px 6px 10px",
            borderRadius: "6px",
            border: `1px solid ${hoverBorder}`,
            background: theme.panel,
            color: normalizedValue ? theme.text : theme.textMuted,
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.15s ease",
            boxSizing: "border-box",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            cursor: "pointer",
          }}
        >
          <option value="">—</option>
          <optgroup label="Major">
            {majors.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </optgroup>
          <optgroup label="Minor">
            {minors.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </optgroup>
        </select>
        <ChevronDown
          size={15}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            color: theme.textMuted,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
