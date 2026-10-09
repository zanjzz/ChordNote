// src/components/ChartPage.jsx
//
// Standalone, read-only full-page view of a chord chart or lyrics page.
// Opened in a new tab via ?view=lyrics or ?view=chords (plus encoded song data).
// No editing controls — just the chart and an autoplay bar.

import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Sun, Moon, Minus, Plus, ChevronDown, ChevronUp, X, Settings } from "lucide-react";
import { isSectionLabel, labelText } from "../utils/sectionHelpers";
import { normalizeChordLine } from "../utils/chordTranspose";
import { convertChordLine } from "../utils/nashvilleNumbers";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { encodeShareData } from "../utils/shareCodec";
import AutoplayControl from "./AutoplayControl";
import whiteLogo from "../assets/default-monochrome-white.svg";
import darkLogo from "../assets/default-monochrome-black.svg";
import iconWhite from "../assets/icon_white.svg";
import iconBlack from "../assets/icon_black.svg";

// Keys we refuse to bind as jump shortcuts — they're reserved for scrolling,
// browser navigation, or text editing. Single printable characters (letters,
// digits, punctuation) are allowed; everything here is blocked.
const BLOCKED_KEYS = new Set([
  " ",
  "Enter",
  "Tab",
  "Escape",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "ContextMenu",
]);

// Is this KeyboardEvent.key an allowed shortcut? Allow exactly one printable
// character (so "a", "5", "/" pass; "F5", "Enter", "Shift" don't).
function isAllowedKey(key) {
  if (BLOCKED_KEYS.has(key)) return false;
  if (key.length !== 1) return false; // excludes "F5", "Tab", etc.
  return true;
}

// ── Design tokens (matches the existing app theme system) ──────────────────

const LIGHT = {
  page: "#FDFCFA",
  surface: "#FFFFFF",
  border: "#E8E5DC",
  text: "#22221F",
  textSecondary: "#5A5A5A",
  textMuted: "#888888",
  labelBg: "rgba(34,34,31,0.055)",
};

const DARK = {
  page: "#121212",
  surface: "#1A1A17",
  border: "#2E2C28",
  text: "#EDEAE3",
  textSecondary: "#A8A398",
  textMuted: "#666360",
  labelBg: "rgba(237,234,227,0.06)",
};

// Typography stack used in the editor for lyrics/body text
const BODY_FONT =
  "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif";
const MONO_FONT = "'JetBrains Mono', 'Courier New', Courier, monospace";

// ── Helpers ────────────────────────────────────────────────────────────────

function IconBtn({ onClick, disabled, colors, children, dim = 30 }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${dim}px`,
        height: `${dim}px`,
        border: "none",
        borderRadius: "6px",
        background: "transparent",
        color: disabled ? colors.textMuted : colors.textSecondary,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

// Converts a #rrggbb hex to an rgba() string with the given alpha.
function hexToRgba(hex, alpha) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Scans the chart lines and returns an ordered list of sections:
//   { id, lineIndex, label }
// `label` is the display name with duplicates auto-numbered — if a chart has
// two "Chorus" sections they become "Chorus 1" and "Chorus 2" so each is
// individually targetable. `id` is a stable key for refs/state (the line
// index, which is unique and stable for a given chart).
function computeSections(lines) {
  // First pass: count how many times each base label appears.
  const counts = {};
  lines.forEach((line) => {
    if (isSectionLabel(line)) {
      const base = labelText(line).trim();
      counts[base] = (counts[base] || 0) + 1;
    }
  });

  // Second pass: build the ordered list, numbering only the labels that
  // actually repeat (a lone "Bridge" stays "Bridge").
  const seen = {};
  const sections = [];
  lines.forEach((line, lineIndex) => {
    if (!isSectionLabel(line)) return;
    const base = labelText(line).trim();
    seen[base] = (seen[base] || 0) + 1;
    const label = counts[base] > 1 ? `${base} ${seen[base]}` : base;
    sections.push({ id: String(lineIndex), lineIndex, label });
  });
  return sections;
}

// Persists an updated jumpKeys map back to every place the editor reads
// from, so a key assigned on the full-page view survives and shows up in
// the editor / saved songs too (full round-trip):
//   1. the ?data= URL of THIS page (so a refresh keeps them)
//   2. localStorage "chordsheet_data" if it's the same song (editor autosave)
//   3. the matching entry in "chordsheet_saved_songs" (saved library)
// Matching is by title+author, which is how the editor already dedupes songs.
function persistJumpKeys(song, jumpKeys) {
  // 1. Update this page's URL so a reload restores the keys.
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = encodeShareData({ ...song, jumpKeys });
    params.set("data", encoded);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
  } catch (_) {
    /* non-fatal */
  }

  // Two songs are "the same" only when they share a non-empty identity.
  // We require a title or author AND matching lyrics — this prevents an
  // untitled view page (title="" author="") from matching, and silently
  // overwriting, an unrelated untitled draft in localStorage. Comparing
  // lyrics too guards against two different songs that happen to share a
  // title. If there's no identity to match on, we skip the write-back
  // entirely (the URL round-trip above still persists the keys for the
  // page itself).
  const hasIdentity = (s) => !!((s.title || "").trim() || (s.author || "").trim());
  const sameSong = (a, b) =>
    hasIdentity(a) &&
    hasIdentity(b) &&
    (a.title || "") === (b.title || "") &&
    (a.author || "") === (b.author || "") &&
    (a.lyrics || "") === (b.lyrics || "");

  if (!hasIdentity(song)) return; // nothing safe to match against

  // 2. The editor's live autosave blob, if it's this song.
  try {
    const raw = localStorage.getItem("chordsheet_data");
    if (raw) {
      const data = JSON.parse(raw);
      if (sameSong(data, song)) {
        data.jumpKeys = jumpKeys;
        localStorage.setItem("chordsheet_data", JSON.stringify(data));
      }
    }
  } catch (_) {
    /* non-fatal */
  }

  // 3. The saved-songs library.
  try {
    const raw = localStorage.getItem("chordsheet_saved_songs");
    if (raw) {
      const songs = JSON.parse(raw);
      let changed = false;
      const updated = songs.map((s) => {
        if (sameSong(s, song)) {
          changed = true;
          return { ...s, jumpKeys };
        }
        return s;
      });
      if (changed) {
        localStorage.setItem(
          "chordsheet_saved_songs",
          JSON.stringify(updated),
        );
      }
    }
  } catch (_) {
    /* non-fatal */
  }
}

// The small monochrome key field shown beside a section label when jump-keys
// is enabled. Dashed border when empty (click → "Enter any key" → press a
// key), solid once a key is set.
function KeyField({ sectionId, assignedKey, assignKey, clearKey, colors }) {
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState("");

  const hasKey = !!assignedKey;

  const handleKeyDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Escape cancels assignment.
    if (e.key === "Escape") {
      setAssigning(false);
      setError("");
      return;
    }
    const err = assignKey(sectionId, e.key);
    if (err === "__conflict__") {
      // A confirm modal took over; close the field and blur so the global
      // key listener works immediately once resolved.
      setError("");
      setAssigning(false);
      e.currentTarget.blur();
      return;
    }
    if (err) {
      setError(err);
      return; // stay in assigning mode so they can try another key
    }
    setError("");
    setAssigning(false);
    // Blur so focus leaves the field — otherwise the data-key-assign guard
    // (while focused) would swallow the very key we just assigned until the
    // user clicks elsewhere. This is what makes the shortcut work instantly.
    e.currentTarget.blur();
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        marginLeft: "8px",
        position: "relative",
      }}
    >
      <span
        data-key-assign="true"
        tabIndex={0}
        role="button"
        onClick={() => {
          setError("");
          setAssigning(true);
        }}
        onKeyDown={assigning ? handleKeyDown : undefined}
        onBlur={() => {
          setAssigning(false);
          setError("");
        }}
        title={
          hasKey
            ? "Press to change the shortcut"
            : "Click, then press any key"
        }
        className={assigning ? "chartpage-key-assigning" : undefined}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: assigning ? "92px" : "26px",
          height: "24px",
          padding: "0 8px",
          fontSize: "12px",
          fontWeight: 700,
          fontFamily: MONO_FONT,
          textTransform: assigning ? "none" : "uppercase",
          letterSpacing: assigning ? "0.02em" : "0.05em",
          color: assigning ? colors.textSecondary : colors.textSecondary,
          background: "transparent",
          border: `1px ${hasKey && !assigning ? "solid" : "dashed"} ${colors.textMuted}`,
          borderRadius: "5px",
          cursor: "pointer",
          outline: "none",
          whiteSpace: "nowrap",
          transition: "min-width 0.15s ease, border-color 0.15s ease",
        }}
      >
        {assigning ? "Enter any key" : hasKey ? assignedKey : "+"}
      </span>

      {/* X button to remove the shortcut — inline on the right, only when a
          key is set and we're not mid-assign. Keeps the row aligned. */}
      {hasKey && !assigning && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            clearKey(sectionId);
          }}
          title="Remove shortcut"
          aria-label="Remove shortcut"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            padding: 0,
            border: "none",
            borderRadius: "50%",
            background: "transparent",
            color: colors.textMuted,
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          <X size={13} />
        </button>
      )}

      {error && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 3px)",
            left: 0,
            fontSize: "10px",
            color: "#e74c3c",
            maxWidth: "200px",
            textTransform: "none",
            letterSpacing: 0,
            lineHeight: 1.3,
            whiteSpace: "normal",
          }}
        >
          {error}
        </span>
      )}
    </span>
  );
}

// A distinct, eye-pleasing section marker: an accent bar in the song's
// chord color + a soft tint of that color behind the label text.
// When jumpKeys are active, shows a subtle read-only key badge (no editing
// in the page — use the Settings modal for that).
function SectionLabel({ text, chordColor, colors, isFirst, sectionId, jumpUI }) {
  const assignedKey = jumpUI?.enabled ? jumpUI.jumpKeys[sectionId] : undefined;

  return (
    <div
      ref={(el) => jumpUI?.registerRef?.(sectionId, el)}
      style={{
        marginTop: isFirst ? 0 : "32px",
        marginBottom: "14px",
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: chordColor,
          background: hexToRgba(chordColor, 0.1),
          padding: "6px 12px",
          fontFamily: BODY_FONT,
        }}
      >
        {`// ${text}`}
      </span>

      {/* Subtle read-only key badge — just a hint that a shortcut is bound.
          No click, no editing here; all management lives in the settings modal. */}
      {jumpUI?.enabled && assignedKey && (
        <span
          title={`Press "${assignedKey.toUpperCase()}" to jump here`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "22px",
            height: "20px",
            padding: "0 6px",
            fontSize: "11px",
            fontWeight: 700,
            fontFamily: MONO_FONT,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: colors.textMuted,
            background: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: "4px",
            opacity: 0.6,
            userSelect: "none",
          }}
        >
          {assignedKey}
        </span>
      )}
    </div>
  );
}

// ── Jump-keys settings modal ───────────────────────────────────────────────
// Lists every section with its assigned key, lets the user edit or clear
// individual keys, and provides a "Clear all" button. Desktop/tablet only
// (opened from the gear icon in the navbar).
function JumpKeysSettingsModal({
  sections,
  jumpKeys,
  assignKey,
  clearKey,
  commitJumpKeys,
  onClose,
  colors,
  chordColor,
  darkMode,
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 61,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "rgba(0,0,0,0.45)",
        animation: "chartpage-overlay-in 0.15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          background: darkMode ? "#1A1A17" : "#FFFFFF",
          border: `1px solid ${colors.border}`,
          borderRadius: "14px",
          padding: "20px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          fontFamily: BODY_FONT,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          animation: "chartpage-overlay-in 0.18s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: colors.text,
            }}
          >
            Jump key shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              border: "none",
              borderRadius: "6px",
              background: "transparent",
              color: colors.textMuted,
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Helper text */}
        <p
          style={{
            margin: "0 0 14px",
            fontSize: "12px",
            color: colors.textMuted,
            lineHeight: 1.5,
          }}
        >
          Click a key badge to change it, or press the × to remove it.
          Keyboard shortcuts work while reading — no modifier keys needed.
        </p>

        {/* Section list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {sections.length === 0 && (
            <p style={{ fontSize: "13px", color: colors.textMuted }}>
              No sections found in this chart.
            </p>
          )}
          {sections.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                background: darkMode
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.03)",
                border: `1px solid ${colors.border}`,
              }}
            >
              {/* Section label */}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: chordColor,
                  flex: 1,
                  marginRight: "12px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>

              {/* Key field (interactive) */}
              <KeyField
                sectionId={s.id}
                assignedKey={jumpKeys[s.id]}
                assignKey={assignKey}
                clearKey={clearKey}
                colors={colors}
              />
            </div>
          ))}
        </div>

        {/* Footer: Clear All + Close */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: `1px solid ${colors.border}`,
            gap: "10px",
          }}
        >
          <button
            onClick={() => commitJumpKeys({})}
            disabled={Object.keys(jumpKeys).length === 0}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              background: "transparent",
              color:
                Object.keys(jumpKeys).length === 0
                  ? colors.textMuted
                  : colors.textSecondary,
              cursor:
                Object.keys(jumpKeys).length === 0 ? "default" : "pointer",
              opacity: Object.keys(jumpKeys).length === 0 ? 0.5 : 1,
            }}
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              padding: "7px 18px",
              borderRadius: "8px",
              border: "none",
              background: chordColor,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaBadge({ label, value, colors }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "13px",
        color: colors.textSecondary,
        fontFamily: BODY_FONT,
      }}
    >
      <span style={{ color: colors.textMuted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ChartPage({ song, mode }) {
  // mode: "lyrics" | "chords"
  const {
    title = "",
    author = "",
    bpm = "",
    musicKey = "",
    capo = "",
    lyrics = "",
    chords = {},
    chordColor = "#0F6E56",
    darkMode: initialDarkMode = false,
    chordDisplayMode = "letters",
    editorFontSize = 15,
  } = song;

  // Local, view-only controls — the dedicated page lets the reader tweak
  // theme and text size without affecting the editor/stored song.
  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [fontSize, setFontSize] = useState(Math.max(editorFontSize, 14));

  const colors = darkMode ? DARK : LIGHT;
  const lines = useMemo(() => lyrics.split("\n"), [lyrics]);

  // ── Jump-keys feature state ─────────────────────────────────────────────
  const sections = useMemo(() => computeSections(lines), [lines]);

  // jumpKeys: { [sectionId]: "a" }  — persisted round-trip with the song.
  // On load, drop any stale entry whose id (a line index) is no longer a
  // section label — e.g. the user edited lyrics in the editor and lines
  // shifted, so a saved key would otherwise point at the wrong line or a
  // non-label line. This self-heals the map rather than mis-jumping.
  const [jumpKeys, setJumpKeys] = useState(() => {
    const raw = song.jumpKeys || {};
    const validIds = new Set(sections.map((s) => s.id));
    const cleaned = {};
    Object.keys(raw).forEach((id) => {
      if (validIds.has(id)) cleaned[id] = raw[id];
    });
    return cleaned;
  });
  const [jumpKeysOn, setJumpKeysOn] = useState(false); // desktop toggle
  const [jumpKeysSettingsOpen, setJumpKeysSettingsOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  // Styled confirm dialog: { message, confirmLabel, onConfirm } or null.
  const [confirmModal, setConfirmModal] = useState(null);
  // The section currently scrolled into view (topmost), for the mobile
  // jump-list highlight. Null until we've measured.
  const [activeSectionId, setActiveSectionId] = useState(null);
  // Whether the highlight should animate. True for scroll/autoplay-driven
  // changes (smooth, nice), false right after a tap-jump (instant — avoids
  // the distracting "slide" when the user explicitly picks a section).
  const [animateHighlight, setAnimateHighlight] = useState(true);

  // Refs to each section's DOM node, keyed by section id, for instant jumps.
  const sectionRefs = useRef({});
  const scrollRef = useRef(null);
  const autoplay = useAutoScroll(scrollRef, { active: true });

  // After a tap-jump we set the active section explicitly. The programmatic
  // scrollTop write then fires the scroll listener, which would re-measure
  // and could overwrite our correct value with a slightly-off one. This
  // timestamp suppresses the scroll-driven measurement for a brief window
  // right after a jump so the tapped section stays highlighted.
  const suppressMeasureUntil = useRef(0);

  // Track which section is at the top of the viewport as the user scrolls,
  // so the mobile jump list can highlight "you are here". Throttled via rAF.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || sections.length === 0) return;
    let raf = null;
    const measure = () => {
      raf = null;
      // Don't fight an explicit tap-jump selection during its window.
      if (Date.now() < suppressMeasureUntil.current) return;
      const scTop = scroller.getBoundingClientRect().top;
      let current = sections[0].id;
      for (const s of sections) {
        const el = sectionRefs.current[s.id];
        if (!el) continue;
        // A section becomes "active" once its top crosses the landing line
        // (just below the navbar). The threshold is a touch beyond the
        // jump landing gap (28px) so a jumped-to section reads as active.
        if (el.getBoundingClientRect().top - scTop <= 36) {
          current = s.id;
        } else {
          break;
        }
      }
      setActiveSectionId(current);
    };
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(measure);
    };
    measure(); // initial
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [sections]);

  // Instant jump: scroll the section to the top of the scroll area, just
  // under the sticky navbar. No smooth behavior — immediate, per spec.
  const jumpToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    const scroller = scrollRef.current;
    if (!el || !scroller) return;
    // Compute the element's position relative to the scroll container using
    // bounding rects (robust regardless of offsetParent nesting), then land
    // it ~16px below the top edge.
    const elRect = el.getBoundingClientRect();
    const scRect = scroller.getBoundingClientRect();
    // Land the section a comfortable gap below the top edge (not flush).
    const top = scroller.scrollTop + (elRect.top - scRect.top) - 28;
    // A tap-jump should snap the highlight instantly (no slide). Set the
    // active section now with animation off, then re-enable animation on
    // the next tick so subsequent scroll/autoplay changes stay smooth.
    setAnimateHighlight(false);
    setActiveSectionId(id);
    // Suppress scroll-driven re-measurement briefly so the programmatic
    // scroll below can't overwrite the section we just explicitly selected.
    suppressMeasureUntil.current = Date.now() + 350;
    scroller.scrollTop = Math.max(0, top);
    requestAnimationFrame(() => setAnimateHighlight(true));
  }, []);

  // Commit a jumpKeys change and persist it everywhere.
  const commitJumpKeys = useCallback(
    (next) => {
      setJumpKeys(next);
      persistJumpKeys(song, next);
    },
    [song],
  );

  // Attempt to assign `key` to `sectionId`. Returns an error string to show
  // inline, or null on success. Handles the conflict rules:
  //  - disallowed key → error message
  //  - key free → assign
  //  - key held by ANOTHER section that has NO key-of-its-own conflict →
  //    ask to replace; if confirmed, move the key over
  //  - both sections already have keys and you type the other's → ask to swap
  const assignKey = useCallback(
    (sectionId, key) => {
      if (!isAllowedKey(key)) {
        return "That key can't be used. Try a letter, number, or symbol.";
      }

      const owner = Object.entries(jumpKeys).find(
        ([sid, k]) => k === key && sid !== sectionId,
      );

      // Key is free (or already this section's) → assign directly.
      if (!owner) {
        commitJumpKeys({ ...jumpKeys, [sectionId]: key });
        return null;
      }

      const ownerId = owner[0];
      const ownerLabel =
        sections.find((s) => s.id === ownerId)?.label || "another section";
      const thisHasKey = !!jumpKeys[sectionId];

      // Conflict → open the styled confirm modal. The actual mutation runs
      // in the modal's onConfirm so it only happens if the user agrees.
      if (thisHasKey) {
        setConfirmModal({
          message: `"${key}" is already used by ${ownerLabel}. Swap keys between the two sections?`,
          confirmLabel: "Swap",
          onConfirm: () => {
            const myOldKey = jumpKeys[sectionId];
            commitJumpKeys({
              ...jumpKeys,
              [sectionId]: key,
              [ownerId]: myOldKey,
            });
          },
        });
      } else {
        setConfirmModal({
          message: `"${key}" is already used by ${ownerLabel}. Use it for this section instead?`,
          confirmLabel: "Use it here",
          onConfirm: () => {
            const next = { ...jumpKeys, [sectionId]: key };
            delete next[ownerId];
            commitJumpKeys(next);
          },
        });
      }
      // Signal to the field that a modal took over (not an error, not done).
      return "__conflict__";
    },
    [jumpKeys, sections, commitJumpKeys],
  );

  // Remove a section's assigned key.
  const clearKey = useCallback(
    (sectionId) => {
      const next = { ...jumpKeys };
      delete next[sectionId];
      commitJumpKeys(next);
    },
    [jumpKeys, commitJumpKeys],
  );

  // Global keyboard listener: pressing an assigned key jumps to its section.
  // Ignored while an assignment field is focused (so typing a key to ASSIGN
  // it doesn't also trigger a jump).
  useEffect(() => {
    const onKeyDown = (e) => {
      // Don't hijack keys while the user is in an input/assignment field.
      const t = e.target;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.getAttribute?.("data-key-assign") === "true")
      ) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;
      // Find the section bound to this key.
      const entry = Object.entries(jumpKeys).find(([, k]) => k === key);
      if (entry) {
        e.preventDefault();
        jumpToSection(entry[0]);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jumpKeys, jumpToSection]);

  // Set the browser tab title to the song title.
  useEffect(() => {
    const label = title || "Untitled Song";
    document.title =
      mode === "chords" ? `${label} — Chords` : `${label} — Lyrics`;
  }, [title, mode]);

  const adjustFont = (delta) =>
    setFontSize((v) => Math.min(40, Math.max(12, v + delta)));

  // Bundle everything the section labels need to render + edit their key
  // field. Passed as one prop so we don't thread a dozen props through the
  // chart sub-components. `labelById` maps lineIndex → auto-numbered label.
  const labelById = useMemo(() => {
    const m = {};
    sections.forEach((s) => {
      m[s.id] = s.label;
    });
    return m;
  }, [sections]);

  const jumpUI = {
    enabled: jumpKeysOn,
    jumpKeys,
    labelById,
    assignKey,
    clearKey,
    registerRef: (id, el) => {
      if (el) sectionRefs.current[id] = el;
    },
    colors,
    darkMode,
  };

  // Chord display conversion (Nashville / Roman / Letters)
  const getDisplayChord = (raw) => {
    if (!raw) return "";
    if (chordDisplayMode === "letters") return normalizeChordLine(raw);
    return convertChordLine(raw, musicKey, chordDisplayMode);
  };

  // ── Meta row ──────────────────────────────────────────────────────────────

  const hasMeta = !!(musicKey || bpm || capo);

  // ── Render ────────────────────────────────────────────────────────────────

  const chordFontSize = fontSize;
  const lyricFontSize = fontSize;

  return (
    <div
      style={{
        height: "100vh",
        background: colors.page,
        color: colors.text,
        fontFamily: BODY_FONT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <style>{`
        /* Full wordmark on wider screens, compact icon on phones. */
        .chartpage-logo-icon { display: none; }
        @media (max-width: 600px) {
          .chartpage-navbar { padding: 8px 12px !important; gap: 8px !important; }
          .chartpage-tools { gap: 6px !important; }
          .chartpage-logo-full { display: none !important; }
          .chartpage-logo-icon { display: block !important; }
        }
        /* The logo must never wrap or shrink — it stays pinned left. */
        .chartpage-logo { flex-shrink: 0; }
        /* If the utility controls can't fit on one line beside the logo,
           only THEY wrap (to a tidy second line, right-aligned) — the navbar
           itself never wraps, so the logo never gets pushed around. */
        @media (max-width: 440px) {
          .chartpage-tools {
            flex-wrap: wrap !important;
            justify-content: flex-end !important;
            row-gap: 8px !important;
          }
        }
        /* The desktop jump-keys toggle hides on phones; the navbar arrow +
           dropdown is the mobile equivalent (and is hidden on desktop). */
        @media (max-width: 600px) {
          .chartpage-jumptoggle { display: none !important; }
          .chartpage-jump-arrow { display: flex !important; }
        }
        @keyframes chartpage-jump-pop {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes chartpage-modal-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes chartpage-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        /* Gentle pulse while waiting for a key in the assignment field. */
        @keyframes chartpage-key-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        .chartpage-key-assigning {
          animation: chartpage-key-blink 0.9s ease-in-out infinite;
        }
      `}</style>

      {/* ── Top bar — stays fixed above the scrolling content ───────────── */}
      <div
        className="chartpage-navbar"
        style={{
          flexShrink: 0,
          background: darkMode
            ? "rgba(18,18,18,0.92)"
            : "rgba(253,252,250,0.92)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: `1px solid ${colors.border}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "nowrap",
          boxSizing: "border-box",
        }}
      >
        {/* Left: logo — full wordmark on desktop, icon-only on mobile.
            Pinned left, never wraps or shrinks. */}
        <a
          className="chartpage-logo"
          href={`${window.location.origin}${window.location.pathname}?editor=true`}
          title="Open ChordNote editor"
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            height: "38px", // match tool button height for alignment
          }}
        >
          <img
            className="chartpage-logo-full"
            src={darkMode ? darkLogo : whiteLogo}
            alt="ChordNote"
            style={{ width: "104px", height: "auto", display: "block" }}
          />
          <img
            className="chartpage-logo-icon"
            src={darkMode ? iconWhite : iconBlack}
            alt="ChordNote"
            style={{ width: "30px", height: "30px", display: "none" }}
          />
        </a>

        {/* Right: tools + autoplay — single row, never wraps */}
        <div
          className="chartpage-tools"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "nowrap",
          }}
        >
          {/* Jump-keys controls — toggle + gear icon sit in a row that
              never shifts: the gear fades/slides in to the RIGHT of the
              toggle, inside a flex row whose width expands smoothly. */}
          <div
            className="chartpage-jumptoggle"
            style={{
              display: "flex",
              alignItems: "center",
              gap: jumpKeysOn ? "6px" : "0px",
              overflow: "hidden",
              transition: "gap 0.2s ease",
            }}
          >
            {/* Toggle button */}
            <button
              onClick={() => setJumpKeysOn((v) => !v)}
              title="Assign keyboard shortcuts to jump between sections"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                height: "38px",
                padding: "0 12px",
                flexShrink: 0,
                borderRadius: "8px",
                border: `1px solid ${jumpKeysOn ? chordColor : colors.border}`,
                background: jumpKeysOn
                  ? hexToRgba(chordColor, 0.12)
                  : darkMode
                    ? "#1A1A17"
                    : "#FFFFFF",
                color: jumpKeysOn ? chordColor : colors.textSecondary,
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
                fontFamily: BODY_FONT,
                whiteSpace: "nowrap",
                transition: "border-color 0.2s ease, background 0.2s ease, color 0.2s ease",
              }}
            >
              {/* sliding pill indicator */}
              <span
                style={{
                  position: "relative",
                  width: "28px",
                  height: "16px",
                  borderRadius: "999px",
                  background: jumpKeysOn ? chordColor : colors.textMuted,
                  flexShrink: 0,
                  transition: "background 0.2s ease",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    left: jumpKeysOn ? "14px" : "2px",
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s ease",
                  }}
                />
              </span>
              Jump keys
            </button>

            {/* Gear icon — slides in when jump-keys is on */}
            <div
              style={{
                maxWidth: jumpKeysOn ? "42px" : "0px",
                opacity: jumpKeysOn ? 1 : 0,
                overflow: "hidden",
                transition: "max-width 0.2s ease, opacity 0.18s ease",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setJumpKeysSettingsOpen(true)}
                title="Jump key settings"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "38px",
                  height: "38px",
                  flexShrink: 0,
                  borderRadius: "8px",
                  border: `1px solid ${colors.border}`,
                  background: darkMode ? "#1A1A17" : "#FFFFFF",
                  color: colors.textSecondary,
                  cursor: "pointer",
                }}
              >
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Font size stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "2px",
              border: `1px solid ${colors.border}`,
              borderRadius: "8px",
              padding: "3px",
              background: darkMode ? "#1A1A17" : "#FFFFFF",
              flexShrink: 0,
            }}
            title="Text size"
          >
            <IconBtn
              onClick={() => adjustFont(-1)}
              disabled={fontSize <= 12}
              colors={colors}
            >
              <Minus size={16} />
            </IconBtn>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: colors.textMuted,
                minWidth: "28px",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {fontSize}
            </span>
            <IconBtn
              onClick={() => adjustFont(1)}
              disabled={fontSize >= 40}
              colors={colors}
            >
              <Plus size={16} />
            </IconBtn>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            title={darkMode ? "Switch to light" : "Switch to dark"}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              flexShrink: 0,
              borderRadius: "8px",
              border: `1px solid ${colors.border}`,
              background: darkMode ? "#1A1A17" : "#FFFFFF",
              color: colors.textSecondary,
              cursor: "pointer",
            }}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Autoplay control (reuses existing component) */}
          <AutoplayControl
            size="lg"
            theme={{
              border: colors.border,
              panel: darkMode ? "#1A1A17" : "#FFFFFF",
              textSecondary: colors.textSecondary,
              textMuted: colors.textMuted,
            }}
            chordColor={chordColor}
            isPlaying={autoplay.isPlaying}
            onToggle={autoplay.toggle}
            speedLabel={autoplay.speedLabel}
            onIncreaseSpeed={autoplay.increaseSpeed}
            onDecreaseSpeed={autoplay.decreaseSpeed}
            canIncrease={autoplay.canIncrease}
            canDecrease={autoplay.canDecrease}
          />

          {/* Mobile-only: toggle the section jump dropdown (up/down arrow). */}
          {sections.length > 0 && (
            <button
              className="chartpage-jump-arrow"
              onClick={() => setMobilePanelOpen((v) => !v)}
              title="Jump to a section"
              aria-label="Jump to a section"
              aria-expanded={mobilePanelOpen}
              style={{
                display: "none", // shown on mobile via CSS
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                flexShrink: 0,
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
                background: darkMode ? "#1A1A17" : "#FFFFFF",
                color: colors.textSecondary,
                cursor: "pointer",
              }}
            >
              {mobilePanelOpen ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile jump dropdown — attached directly under the navbar ──── */}
      {sections.length > 0 && mobilePanelOpen && (
        <div
          className="chartpage-jump-dropdown"
          style={{
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            // Extra bottom padding so the chips don't crowd the first
            // section once content scrolls beneath.
            padding: "12px 16px 18px",
            background: darkMode ? "#1A1A17" : "#FFFFFF",
            // Subtle divider instead of a distracting drop shadow.
            borderBottom: `1px solid ${colors.border}`,
            animation: "chartpage-jump-pop 0.18s ease",
          }}
        >
          {sections.map((s) => {
            const active = activeSectionId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => jumpToSection(s.id)}
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: active ? chordColor : colors.textSecondary,
                  background: active
                    ? hexToRgba(chordColor, 0.12)
                    : darkMode
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                  border: `1px solid ${active ? chordColor : "transparent"}`,
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontFamily: BODY_FONT,
                  whiteSpace: "nowrap",
                  transition: animateHighlight
                    ? "background 0.25s ease, color 0.25s ease, border-color 0.25s ease"
                    : "none",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Scrollable content area ──────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "48px 24px 80px",
          boxSizing: "border-box",
        }}
      >
        {/* Inner container: centered, generous margins, left-aligned text */}
        <div
          style={{
            maxWidth: "720px",
            margin: "0 auto",
            textAlign: "left",
          }}
        >
          {/* ── Header ────────────────────────────────────────────────────── */}
          <header style={{ marginBottom: "40px" }}>
            <h1
              style={{
                margin: "0 0 8px",
                fontSize: "clamp(28px, 5vw, 42px)",
                fontWeight: 800,
                lineHeight: 1.15,
                color: colors.text,
                fontFamily: BODY_FONT,
                letterSpacing: "-0.02em",
              }}
            >
              {title || "Untitled Song"}
            </h1>

            {author && (
              <p
                style={{
                  margin: "0 0 12px",
                  fontSize: "16px",
                  fontWeight: 500,
                  color: colors.textSecondary,
                  fontFamily: BODY_FONT,
                }}
              >
                {author}
              </p>
            )}

            {hasMeta && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  marginTop: "4px",
                }}
              >
                <MetaBadge label="Key" value={musicKey} colors={colors} />
                <MetaBadge label="BPM" value={bpm} colors={colors} />
                <MetaBadge label="Capo" value={capo} colors={colors} />
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                marginTop: "28px",
                height: "1px",
                background: colors.border,
              }}
            />
          </header>

          {/* ── Chart body ────────────────────────────────────────────────── */}
          {mode === "chords" ? (
            <ChordChart
              lines={lines}
              chords={chords}
              getDisplayChord={getDisplayChord}
              chordFontSize={chordFontSize}
              lyricFontSize={lyricFontSize}
              chordColor={chordColor}
              colors={colors}
              jumpUI={jumpUI}
            />
          ) : (
            <LyricsView
              lines={lines}
              lyricFontSize={lyricFontSize}
              chordColor={chordColor}
              colors={colors}
              jumpUI={jumpUI}
            />
          )}
        </div>
      </div>

      {/* ── Styled confirm modal (replaces window.confirm) ─────────────── */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(0,0,0,0.45)",
            animation: "chartpage-overlay-in 0.15s ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "380px",
              background: darkMode ? "#1A1A17" : "#FFFFFF",
              border: `1px solid ${colors.border}`,
              borderRadius: "14px",
              padding: "20px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              fontFamily: BODY_FONT,
              animation: "chartpage-overlay-in 0.18s ease",
            }}
          >
            <p
              style={{
                margin: "0 0 18px",
                fontSize: "15px",
                lineHeight: 1.5,
                color: colors.text,
              }}
            >
              {confirmModal.message}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: "8px 16px",
                  fontSize: "14px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  border: `1px solid ${colors.border}`,
                  background: "transparent",
                  color: colors.textSecondary,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm?.();
                  setConfirmModal(null);
                }}
                style={{
                  padding: "8px 18px",
                  fontSize: "14px",
                  fontWeight: 700,
                  borderRadius: "8px",
                  border: "none",
                  background: chordColor,
                  color: "#FFFFFF",
                  cursor: "pointer",
                }}
              >
                {confirmModal.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Jump-keys settings modal ────────────────────────────────────── */}
      {jumpKeysSettingsOpen && (
        <JumpKeysSettingsModal
          sections={sections}
          jumpKeys={jumpKeys}
          assignKey={assignKey}
          clearKey={clearKey}
          commitJumpKeys={commitJumpKeys}
          onClose={() => setJumpKeysSettingsOpen(false)}
          colors={colors}
          chordColor={chordColor}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}

function ChordChart({
  lines,
  chords,
  getDisplayChord,
  chordFontSize,
  lyricFontSize,
  chordColor,
  colors,
  jumpUI,
}) {
  const isEmpty = lines.length === 0 || (lines.length === 1 && lines[0] === "");
  if (isEmpty) {
    return (
      <p style={{ color: colors.textMuted, fontFamily: BODY_FONT }}>
        No content yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
      {lines.map((line, i) => {
        if (isSectionLabel(line)) {
          return (
            <SectionLabel
              key={i}
              sectionId={String(i)}
              text={jumpUI?.labelById?.[String(i)] || labelText(line)}
              chordColor={chordColor}
              colors={colors}
              isFirst={i === 0}
              jumpUI={jumpUI}
            />
          );
        }

        const chord = chords[i];
        const displayChord = getDisplayChord(chord || "");
        const hasChord = displayChord && displayChord.trim();

        return (
          <div
            key={i}
            style={{
              marginBottom: "10px",
            }}
          >
            {hasChord && (
              <div
                style={{
                  fontSize: `${chordFontSize}px`,
                  fontWeight: 700,
                  color: chordColor,
                  fontFamily: MONO_FONT,
                  lineHeight: 1.3,
                  whiteSpace: "pre",
                  marginBottom: "1px",
                  letterSpacing: "0.02em",
                }}
              >
                {displayChord}
              </div>
            )}
            <div
              style={{
                fontSize: `${lyricFontSize}px`,
                lineHeight: 1.65,
                color: line === "" ? "transparent" : colors.text,
                fontFamily: BODY_FONT,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                minHeight: `${lyricFontSize * 1.65}px`,
              }}
            >
              {line === "" ? "\u00A0" : line}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Lyrics-only sub-component ──────────────────────────────────────────────

function LyricsView({ lines, lyricFontSize, chordColor, colors, jumpUI }) {
  const isEmpty = lines.length === 0 || (lines.length === 1 && lines[0] === "");
  if (isEmpty) {
    return (
      <p style={{ color: colors.textMuted, fontFamily: BODY_FONT }}>
        No lyrics yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line, i) => {
        if (isSectionLabel(line)) {
          return (
            <SectionLabel
              key={i}
              sectionId={String(i)}
              text={jumpUI?.labelById?.[String(i)] || labelText(line)}
              chordColor={chordColor}
              colors={colors}
              isFirst={i === 0}
              jumpUI={jumpUI}
            />
          );
        }

        return (
          <div
            key={i}
            style={{
              fontSize: `${lyricFontSize}px`,
              lineHeight: 1.8,
              color: line === "" ? "transparent" : colors.text,
              fontFamily: BODY_FONT,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              minHeight: `${lyricFontSize * 1.8}px`,
            }}
          >
            {line === "" ? "\u00A0" : line}
          </div>
        );
      })}
    </div>
  );
}
