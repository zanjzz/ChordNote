// src/components/IconBtn.jsx
import React from "react";

export default function IconBtn({ onClick, icon, label }) {
  return (
    <button onClick={onClick} className="chord-btn-icon">
      {icon}
      {label}
    </button>
  );
}
