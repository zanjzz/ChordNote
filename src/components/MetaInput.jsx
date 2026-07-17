// src/components/MetaInput.jsx
import React, { useState } from "react";

function filterBpm(raw) {
  return raw.replace(/[^0-9]/g, "").slice(0, 3);
}

function filterKey(raw) {
  let cleaned = raw.replace(/[^A-Ga-g#bm]/g, "");
  const match = cleaned.match(/^([A-Ga-g])(#|b)?(m)?/);
  return match ? match[0] : "";
}

function formatKey(raw) {
  if (!raw) return raw;
  const match = raw.match(/^([A-Ga-g])(#|b)?(m)?/);
  if (!match) return raw;
  const [, root, accidental, minor] = match;
  let result = root.toUpperCase();
  if (accidental) result += accidental;
  if (minor) result += "m";
  return result;
}

const FILTERS = {
  bpm: filterBpm,
  key: (raw) => formatKey(filterKey(raw)),
};

export default function MetaInput({
  theme,
  label,
  value,
  onChange,
  placeholder,
  validate,
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleChange = (e) => {
    const raw = e.target.value;
    const filter = FILTERS[validate];
    onChange(filter ? filter(raw) : raw);
  };

  // ✅ Neutral hover color – uses theme.textSecondary
  const hoverBorder = isHovered ? theme.textSecondary : theme.border;

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
        {label}
      </label>
      <input
        type="text"
        inputMode={validate === "bpm" ? "numeric" : "text"}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          width: "100%",
          padding: "6px 10px",
          borderRadius: "6px",
          border: `1px solid ${hoverBorder}`,
          background: theme.panel,
          color: theme.text,
          fontSize: "14px",
          outline: "none",
          transition: "border-color 0.15s ease",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
