// src/components/StepBtn.jsx
import React from "react";

export default function StepBtn({
  theme,
  onClick,
  icon,
  disabled,
  className,
  "aria-label": ariaLabel,
  ...props
}) {
  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "30px", // Increased from 24px
        height: "30px", // Increased from 24px
        padding: 0,
        borderRadius: "4px",
        border: `1px solid ${theme.border}`,
        background: theme.panel,
        color: theme.textSecondary,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s ease",
        flexShrink: 0,
        ...props.style,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = theme.borderSoft;
          e.currentTarget.style.borderColor = theme.text;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = theme.panel;
        e.currentTarget.style.borderColor = theme.border;
      }}
    >
      {icon}
    </button>
  );
}
