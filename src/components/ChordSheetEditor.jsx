// src/components/ChordSheetEditor.jsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Share2,
  FileText,
  Printer,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";

// ---- Constants & Themes ----
import {
  LIGHT_THEME,
  DARK_THEME,
  CHORD_COLOR_PRESETS,
} from "../constants/themes.js";

const STORAGE_KEY = "chordsheet_data";
const SAVED_SONGS_KEY = "chordsheet_saved_songs";
const MAX_SAVED_SONGS = 100;

// ---- Utils ----
import {
  transposeChordLine,
  transposeKey,
  normalizeChordCase,
  normalizeChordLine,
} from "../utils/chordTranspose.js";
import { isSectionLabel, SECTION_PRESETS } from "../utils/sectionHelpers.js";
import { convertChordLine } from "../utils/nashvilleNumbers.js";
import { generatePages, downloadPages } from "../utils/canvasHelpers.js";
import { encodeShareData, decodeShareData } from "../utils/shareCodec.js";

// ---- Hooks ----
import { useChordRealignment } from "../hooks/useChordRealignment.js";

// ---- Components ----
import MetaInput from "./MetaInput.jsx";
import TopBar from "./TopBar.jsx";
import ControlsBar from "./ControlsBar.jsx";
import LyricsPanel from "./LyricsPanel.jsx";
import ChordsPanel from "./ChordsPanel.jsx";
import PreviewModal from "./PreviewModal/PreviewModal.jsx";
import ChordImporter from "./ChordImporter.jsx";
import SavedSongsModal from "./SavedSongsModal.jsx";
import SupportBanner from "./SupportBanner.jsx";
import Footer from "./Footer.jsx";

// ---- Modals ----
import Toast from "./modals/Toast.jsx";
import ConfirmDeleteModal from "./modals/ConfirmDeleteModal.jsx";
import ConfirmDeleteAllModal from "./modals/ConfirmDeleteAllModal.jsx";
import MilestoneModal from "./modals/MilestoneModal.jsx";
import ConfirmClearModal from "./modals/ConfirmClearModal.jsx"; // 👈 NEW IMPORT

// ---- Safe localStorage helper ----
const readSavedSongsFromStorage = () => {
  try {
    const stored = localStorage.getItem(SAVED_SONGS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (_) {
    return [];
  }
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function ChordSheetEditor() {
  // ---- Load initial state ----
  const loadInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const sharedData = params.get("data");

    if (sharedData) {
      try {
        const decoded = decodeShareData(sharedData);
        if (!decoded) throw new Error("Invalid share data");
        return {
          title: decoded.title || "",
          author: decoded.author || "",
          bpm: decoded.bpm || "",
          musicKey: decoded.musicKey || "",
          capo: decoded.capo || "",
          lyrics: decoded.lyrics || "",
          chords: decoded.chords || {},
          transposeOffset: decoded.transposeOffset || 0,
          editorFontSize: decoded.editorFontSize || 15,
          chordColor: decoded.chordColor || "#0F6E56",
          columns: decoded.columns || 1,
          alignment: decoded.alignment || "left",
          darkMode: decoded.darkMode || false,
          showLineNumbers: decoded.showLineNumbers ?? false,
          chordDisplayMode: decoded.chordDisplayMode || "letters",
        };
      } catch (_) {}
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (_) {}
    }

    return {
      title: "",
      author: "",
      bpm: "",
      musicKey: "",
      capo: "",
      lyrics: "",
      chords: {},
      transposeOffset: 0,
      editorFontSize: 15,
      chordColor: "#0F6E56",
      columns: 1,
      alignment: "left",
      darkMode: false,
      showLineNumbers: false,
      chordDisplayMode: "letters",
    };
  };

  const initialState = loadInitialState();

  // ---- State ----
  const [darkMode, setDarkMode] = useState(initialState.darkMode);
  const [chordColor, setChordColor] = useState(initialState.chordColor);
  const [title, setTitle] = useState(initialState.title);
  const [author, setAuthor] = useState(initialState.author);
  const [bpm, setBpm] = useState(initialState.bpm);
  const [musicKey, setMusicKey] = useState(initialState.musicKey);
  const [capo, setCapo] = useState(initialState.capo);
  const [lyrics, setLyrics] = useState(initialState.lyrics);
  const [chords, setChords] = useState(initialState.chords);
  const [transposeOffset, setTransposeOffset] = useState(
    initialState.transposeOffset,
  );
  const [editorFontSize, setEditorFontSize] = useState(
    initialState.editorFontSize,
  );
  const [showPreview, setShowPreview] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showSavedSongs, setShowSavedSongs] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [columns, setColumns] = useState(initialState.columns);
  const [alignment, setAlignment] = useState(initialState.alignment);
  const [showLineNumbers, setShowLineNumbers] = useState(
    initialState.showLineNumbers,
  );
  const [chordDisplayMode, setChordDisplayMode] = useState(() => {
    const saved = localStorage.getItem("chordDisplayMode");
    return saved || initialState.chordDisplayMode || "letters";
  });
  const [savedSongs, setSavedSongs] = useState(readSavedSongsFromStorage);
  const [copyFeedback, setCopyFeedback] = useState(null);

  // ---- Modal states ----
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [confirmDelete, setConfirmDelete] = useState({
    visible: false,
    songId: null,
    title: "",
  });
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState({
    visible: false,
    count: 0,
    isLimit: false,
  });
  const [shownMilestones, setShownMilestones] = useState(new Set());
  const [milestoneCloseUnlocked, setMilestoneCloseUnlocked] = useState(true);
  const milestoneTimerRef = useRef(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false); // 👈 NEW STATE

  // ---- Refs ----
  const prevLinesRef = useRef(null);
  const chordsRef = useRef(chords);
  const clearedBackupRef = useRef(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const copyMenuRef = useRef(null);
  const copyFeedbackTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  const theme = darkMode ? DARK_THEME : LIGHT_THEME;
  const lines = useMemo(() => lyrics.split("\n"), [lyrics]);

  // ---- Sync refs ----
  useEffect(() => {
    chordsRef.current = chords;
  }, [chords]);

  useEffect(() => {
    if (prevLinesRef.current === null) {
      prevLinesRef.current = lines;
    }
  }, [lines]);

  // ---- Auto-save ----
  useEffect(() => {
    const dataToSave = {
      darkMode,
      chordColor,
      title,
      author,
      bpm,
      musicKey,
      capo,
      lyrics,
      chords,
      transposeOffset,
      editorFontSize,
      columns,
      alignment,
      showLineNumbers,
      chordDisplayMode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [
    darkMode,
    chordColor,
    title,
    author,
    bpm,
    musicKey,
    capo,
    lyrics,
    chords,
    transposeOffset,
    editorFontSize,
    columns,
    alignment,
    showLineNumbers,
    chordDisplayMode,
  ]);

  useEffect(() => {
    localStorage.setItem("chordDisplayMode", chordDisplayMode);
  }, [chordDisplayMode]);

  useEffect(() => {
    localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(savedSongs));
  }, [savedSongs]);

  // ---- Chord realignment ----
  useChordRealignment({
    lines,
    chords,
    setChords,
    prevLinesRef,
    chordsRef,
    clearedBackupRef,
  });

  // ---- Click outside copy menu ----
  useEffect(() => {
    if (!showCopyMenu) return;
    const handleClickOutside = (e) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCopyMenu]);

  // ---- Toast & Timeout cleanup ----
  useEffect(() => {
    return () => {
      if (copyFeedbackTimeoutRef.current)
        clearTimeout(copyFeedbackTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
    };
  }, []);

  // ---- Milestone modal lock ----
  useEffect(() => {
    if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);

    if (milestoneToast.visible && !milestoneToast.isLimit) {
      setMilestoneCloseUnlocked(false);
      milestoneTimerRef.current = setTimeout(() => {
        setMilestoneCloseUnlocked(true);
      }, 5000);
    } else {
      setMilestoneCloseUnlocked(true);
    }

    return () => {
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
    };
  }, [milestoneToast.visible, milestoneToast.isLimit, milestoneToast.count]);

  const closeMilestoneToast = () => {
    if (!milestoneCloseUnlocked) return;
    setMilestoneToast({ visible: false, count: 0, isLimit: false });
  };

  const EDITOR_MIN = 12;
  const EDITOR_MAX = 20;
  const PREVIEW_MIN = 12;
  const PREVIEW_MAX = 26;
  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

  // ---- Handlers ----
  const handleChordChange = (index, value) => {
    setChords((prev) => ({ ...prev, [index]: value }));
  };

  const handleTranspose = (steps) => {
    setChords((prev) => {
      const next = {};
      Object.keys(prev).forEach((k) => {
        const transposed = transposeChordLine(prev[k], steps);
        next[k] = normalizeChordCase(transposed);
      });
      return next;
    });

    if (musicKey && musicKey.trim() !== "") {
      setMusicKey(transposeKey(musicKey, steps));
    }

    setTransposeOffset((prev) => prev + steps);
  };

  const handleKeyChange = (newKey) => {
    setMusicKey(newKey);
    setTransposeOffset(0);
  };

  const addSection = (label) => {
    setLyrics((prevLyrics) => {
      const regex = new RegExp(`\\[${label}(?:\\s(\\d+))?\\]`, "gi");
      const matches = [...prevLyrics.matchAll(regex)];
      let newLabel = label;
      if (matches.length > 0) {
        let maxNum = 1;
        matches.forEach((m) => {
          const num = m[1] ? parseInt(m[1], 10) : 1;
          if (num >= maxNum) maxNum = num + 1;
        });
        newLabel = `${label} ${maxNum}`;
      }

      const section = `[${newLabel}]\n`;

      if (!prevLyrics.trim()) {
        return section;
      }

      const trimmedContent = prevLyrics.replace(/\s+$/, "");
      return `${trimmedContent}\n\n${section}`;
    });
  };

  const handleImport = (data) => {
    prevLinesRef.current = data.lyrics.split("\n");
    clearedBackupRef.current = null;
    setLyrics(data.lyrics);
    const normalizedChords = {};
    Object.keys(data.chords || {}).forEach((key) => {
      normalizedChords[key] = normalizeChordLine(data.chords[key]);
    });
    setChords(normalizedChords);
    setTransposeOffset(0);
    if (data.detectedMode) {
      setChordDisplayMode(data.detectedMode);
    }
  };

  // ---- Clear function ----
  const handleClear = () => {
    setTitle("");
    setAuthor("");
    setBpm("");
    setMusicKey("");
    setCapo("");
    setLyrics("");
    setChords({});
    setTransposeOffset(0);
    prevLinesRef.current = [""];
    clearedBackupRef.current = null;
    setShowClearConfirm(false);
    showToast("All inputs cleared.", "info");
  };

  // ---- Copy functions ----
  const writeToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise((resolve, reject) => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      ok ? resolve() : reject(new Error("execCommand copy failed"));
    });
  };

  const buildLyricsOnlyText = () => {
    const parts = [];
    if (title) parts.push(title);
    if (author) parts.push(author);
    const metaBits = [
      musicKey ? `Key: ${musicKey}` : null,
      bpm ? `BPM: ${bpm}` : null,
      capo ? `Capo: ${capo}` : null,
    ].filter(Boolean);
    if (metaBits.length) parts.push(metaBits.join("  "));
    const header = parts.join("\n");
    return header ? `${header}\n\n${lyrics}` : lyrics;
  };

  const buildLyricsWithChordsText = () => {
    const outLines = [];
    lines.forEach((line, i) => {
      const chord = chords[i];
      if (chord && chord.trim() && !isSectionLabel(line)) {
        const displayChord =
          chordDisplayMode === "letters"
            ? normalizeChordLine(chord)
            : convertChordLine(chord, musicKey, chordDisplayMode);
        outLines.push(displayChord);
      }
      outLines.push(line);
    });
    const parts = [];
    if (title) parts.push(title);
    if (author) parts.push(author);
    const metaBits = [
      musicKey ? `Key: ${musicKey}` : null,
      bpm ? `BPM: ${bpm}` : null,
      capo ? `Capo: ${capo}` : null,
    ].filter(Boolean);
    if (metaBits.length) parts.push(metaBits.join("  "));
    const header = parts.join("\n");
    const body = outLines.join("\n");
    return header ? `${header}\n\n${body}` : body;
  };

  const handleCopy = async (type) => {
    const text =
      type === "lyrics" ? buildLyricsOnlyText() : buildLyricsWithChordsText();
    try {
      await writeToClipboard(text);
      setCopyFeedback(type);
      if (copyFeedbackTimeoutRef.current)
        clearTimeout(copyFeedbackTimeoutRef.current);
      copyFeedbackTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(null);
      }, 1500);
    } catch (err) {
      console.error("Copy failed:", err);
    }
    setShowCopyMenu(false);
  };

  const showToast = (message, type = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  // ---- Library functions ----
  const handleSaveCurrentSong = () => {
    const newSong = {
      id: Date.now(),
      title: title || "Untitled Song",
      author: author || "",
      bpm: bpm || "",
      musicKey: musicKey || "",
      capo: capo || "",
      lyrics: lyrics || "",
      chords: chords || {},
      chordColor: chordColor || "#0F6E56",
      editorFontSize: editorFontSize || 15,
      transposeOffset: transposeOffset || 0,
    };

    setSavedSongs((prev) => {
      if (prev.length >= MAX_SAVED_SONGS) {
        setMilestoneToast({
          visible: true,
          count: MAX_SAVED_SONGS,
          isLimit: true,
        });
        return prev;
      }

      const existingIdx = prev.findIndex(
        (s) => s.title === newSong.title && s.author === newSong.author,
      );
      let updatedList;
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newSong;
        showToast(`"${newSong.title}" updated successfully!`, "success");
        updatedList = updated;
      } else {
        showToast(`"${newSong.title}" saved successfully!`, "success");
        updatedList = [...prev, newSong];
      }

      const newCount = updatedList.length;
      if (
        newCount > 0 &&
        newCount % 10 === 0 &&
        !shownMilestones.has(newCount)
      ) {
        setShownMilestones((prev) => new Set(prev).add(newCount));
        setMilestoneToast({
          visible: true,
          count: newCount,
          isLimit: false,
        });
      }

      return updatedList;
    });
  };

  const handleLoadSong = (song) => {
    setShowSavedSongs(false);

    setTitle(song.title || "");
    setAuthor(song.author || "");
    setBpm(song.bpm || "");
    setMusicKey(song.musicKey || "");
    setCapo(song.capo || "");
    setLyrics(song.lyrics || "");
    const normalizedChords = {};
    Object.keys(song.chords || {}).forEach((key) => {
      normalizedChords[key] = normalizeChordLine(song.chords[key]);
    });
    setChords(normalizedChords);
    setChordColor(song.chordColor || "#0F6E56");
    setEditorFontSize(song.editorFontSize || 15);
    setTransposeOffset(song.transposeOffset || 0);
    prevLinesRef.current = (song.lyrics || "").split("\n");
    clearedBackupRef.current = null;
  };

  const triggerDelete = (id, songTitle) => {
    setConfirmDelete({ visible: true, songId: id, title: songTitle });
  };

  const handleConfirmDelete = () => {
    setSavedSongs((prev) => prev.filter((s) => s.id !== confirmDelete.songId));
    setConfirmDelete({ visible: false, songId: null, title: "" });
    showToast("Song deleted.", "info");
  };

  const handleConfirmDeleteAll = () => {
    setSavedSongs([]);
    setConfirmDeleteAll(false);
    showToast("All saved songs deleted.", "info");
  };

  const handleShare = () => {
    const dataToShare = {
      title,
      author,
      bpm,
      musicKey,
      capo,
      lyrics,
      chords,
      transposeOffset,
      editorFontSize,
      chordColor,
      columns,
      alignment,
      darkMode,
      showLineNumbers,
      chordDisplayMode,
    };
    const encoded = encodeShareData(dataToShare);
    const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encoded}`;

    if (navigator.share) {
      navigator
        .share({
          title: title || "Chord Sheet",
          text: `Check out this chord sheet: ${title || "Untitled"}`,
          url: shareUrl,
        })
        .catch(() => {
          writeToClipboard(shareUrl).then(() =>
            showToast("Share link copied!", "success"),
          );
        });
    } else {
      writeToClipboard(shareUrl).then(() =>
        showToast("Share link copied!", "success"),
      );
    }
  };

  const milestoneLocked =
    milestoneToast.visible &&
    !milestoneToast.isLimit &&
    !milestoneCloseUnlocked;

  // ---- Render ----
  return (
    <div
      className="chord-app-container"
      style={{ background: theme.page, color: theme.text }}
    >
      <style>{`
        html, body {
          background: ${theme.page};
          transition: background 0.15s ease;
        }


        a {
          color: ${theme.text} !important;
          text-decoration: none !important;
        }
        a:hover {
          color: ${theme.textSecondary} !important;
        }
        a.chord-cta-link,
        a.chord-cta-link:hover {
          color: ${theme.panel} !important;
        }
        .chord-milestone-box .close-btn {
          color: ${theme.textMuted} !important;
          background: none !important;
        }
        .chord-milestone-box .close-btn:hover {
          background: ${theme.borderSoft} !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes milestoneTimerShrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }


        /* ---------- MOBILE OVERRIDES ONLY ---------- */
        @media (max-width: 768px) {
          .chord-meta-input {
            padding: 12px 14px !important;
            font-size: 16px !important;
            min-height: 44px !important;
          }
          .chord-btn-step {
            width: 36px !important;
            height: 36px !important;
          }
          .chord-action-bar > button {
            padding: 14px 10px !important;
            font-size: 14px !important;
            min-height: 48px !important;
          }
          .chord-controls-wrap {
            gap: 16px !important;
          }
          .chord-top-bar {
            gap: 16px !important;
          }
        }

        @media (max-width: 480px) {
          .chord-action-bar > button {
            padding: 12px 8px !important;
            font-size: 12px !important;
            flex-direction: row !important;
            gap: 6px !important;
          }
          .chord-meta-grid {
            gap: 12px !important;
          }
        }
      `}</style>

      <TopBar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        chordColor={chordColor}
        theme={theme}
        onSave={handleSaveCurrentSong}
        onViewSaved={() => setShowSavedSongs(true)}
        savedCount={savedSongs.length}
        onClear={() => setShowClearConfirm(true)}
      />

      <div className="chord-meta-grid">
        <MetaInput
          theme={theme}
          chordColor={chordColor}
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="Song title"
        />
        <MetaInput
          theme={theme}
          chordColor={chordColor}
          label="Author"
          value={author}
          onChange={setAuthor}
          placeholder="Artist / writer"
        />
        <MetaInput
          theme={theme}
          chordColor={chordColor}
          label="BPM"
          value={bpm}
          onChange={setBpm}
          placeholder="120"
          validate="bpm"
        />
        <MetaInput
          theme={theme}
          chordColor={chordColor}
          label="Key"
          value={musicKey}
          onChange={handleKeyChange}
          placeholder="G"
          validate="key"
        />
        <MetaInput
          theme={theme}
          chordColor={chordColor}
          label="Capo"
          value={capo}
          onChange={setCapo}
          placeholder="2nd fret"
        />
      </div>

      <ControlsBar
        theme={theme}
        chordColor={chordColor}
        setChordColor={setChordColor}
        transposeOffset={transposeOffset}
        handleTranspose={handleTranspose}
        editorFontSize={editorFontSize}
        setEditorFontSize={setEditorFontSize}
        EDITOR_MIN={EDITOR_MIN}
        EDITOR_MAX={EDITOR_MAX}
        clamp={clamp}
        showLineNumbers={showLineNumbers}
        setShowLineNumbers={setShowLineNumbers}
        chordDisplayMode={chordDisplayMode}
        setChordDisplayMode={setChordDisplayMode}
        musicKey={musicKey}
      />

      <div className="chord-editor-grid">
        <LyricsPanel
          theme={theme}
          lyrics={lyrics}
          setLyrics={setLyrics}
          editorFontSize={editorFontSize}
          addSection={addSection}
          chordColor={chordColor}
          showLineNumbers={showLineNumbers}
        />
        <ChordsPanel
          lines={lines}
          chords={chords}
          handleChordChange={handleChordChange}
          editorFontSize={editorFontSize}
          chordColor={chordColor}
          theme={theme}
          showLineNumbers={showLineNumbers}
          chordDisplayMode={chordDisplayMode}
          musicKey={musicKey}
        />
      </div>

      {/* Bottom Action Bar - unchanged desktop layout */}
      <div
        className="chord-action-bar"
        style={{
          marginTop: "20px",
        }}
      >
        <button
          onClick={() => setShowImporter(true)}
          onMouseEnter={() => setHoveredBtn("import")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "transparent",
            color: theme.text,
            border: `1px solid ${hoveredBtn === "import" ? chordColor : theme.border}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s ease",
          }}
        >
          <FileText size={16} /> Import
        </button>

        <button
          onClick={handleShare}
          onMouseEnter={() => setHoveredBtn("share")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "transparent",
            color: theme.text,
            border: `1px solid ${hoveredBtn === "share" ? chordColor : theme.border}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s ease",
          }}
        >
          <Share2 size={16} /> Share
        </button>

        <button
          ref={copyMenuRef}
          onClick={() => setShowCopyMenu((v) => !v)}
          onMouseEnter={() => setHoveredBtn("copy")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "transparent",
            color: theme.text,
            border: `1px solid ${hoveredBtn === "copy" ? chordColor : theme.border}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s ease",
          }}
        >
          <span className="chord-action-icon">
            {copyFeedback ? (
              <Check size={16} color={chordColor} />
            ) : (
              <Copy size={16} />
            )}
          </span>
          {copyFeedback ? "Copied!" : "Copy"}
          <ChevronDown
            size={14}
            style={{
              transform: showCopyMenu ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          />

          {showCopyMenu && (
            <div
              className="chord-copy-menu"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                bottom: "calc(100% + 10px)",
                left: 0, // 👈 Anchors to left edge
                width: "100%", // 👈 Fills the button exactly
                minWidth: "auto", // 👈 Removes the fixed 190px
                boxSizing: "border-box", // 👈 Includes padding in width
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: "12px",
                boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
                padding: "6px",
                zIndex: 10,
                animation: "slideUp 0.18s ease",
              }}
            >
              <button
                onClick={() => handleCopy("lyrics")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: theme.text,
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = theme.borderSoft)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <FileText size={14} color={theme.textMuted} /> Lyrics only
              </button>
              <button
                onClick={() => handleCopy("full")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 10px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: theme.text,
                  background: "transparent",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = theme.borderSoft)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Copy size={14} color={theme.textMuted} /> Lyrics + chords
              </button>
            </div>
          )}
        </button>

        <button
          onClick={() => setShowPreview(true)}
          onMouseEnter={() => setHoveredBtn("preview")}
          onMouseLeave={() => setHoveredBtn(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: chordColor,
            color: (() => {
              const hex = chordColor.replace("#", "");
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              return brightness > 140 ? "#22221F" : "#FFFFFF";
            })(),
            border: `1px solid ${hoveredBtn === "preview" ? theme.text : chordColor}`,
            borderRadius: "8px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s ease",
          }}
        >
          <Printer size={25} style={{ width: 15, height: 20, flexShrink: 0 }} />{" "}
          Preview & export
        </button>
      </div>

      {/* Modals */}
      <PreviewModal
        appTheme={darkMode ? "dark" : "light"}
        showPreview={showPreview}
        setShowPreview={setShowPreview}
        lines={lines}
        chords={chords}
        fontSize={fontSize}
        setFontSize={setFontSize}
        PREVIEW_MIN={PREVIEW_MIN}
        PREVIEW_MAX={PREVIEW_MAX}
        clamp={clamp}
        columns={columns}
        setColumns={setColumns}
        alignment={alignment}
        setAlignment={setAlignment}
        chordColor={chordColor}
        setChordColor={setChordColor}
        title={title}
        author={author}
        musicKey={musicKey}
        bpm={bpm}
        capo={capo}
        downloadPages={downloadPages}
        chordDisplayMode={chordDisplayMode}
        generatePages={(opts = {}) =>
          generatePages({
            lines,
            chords,
            fontSize,
            author,
            musicKey,
            bpm,
            capo,
            columns,
            chordDisplayMode,
            ...opts,
          })
        }
      />

      {showImporter && (
        <ChordImporter
          onImport={handleImport}
          onClose={() => setShowImporter(false)}
          theme={theme}
          chordColor={chordColor}
          musicKey={musicKey}
        />
      )}

      {showSavedSongs && (
        <SavedSongsModal
          savedSongs={savedSongs}
          onClose={() => setShowSavedSongs(false)}
          onSelect={handleLoadSong}
          onDelete={triggerDelete}
          onDeleteAll={() => setConfirmDeleteAll(true)}
          theme={theme}
        />
      )}

      {/* Clear Modal */}
      <ConfirmClearModal
        visible={showClearConfirm}
        onConfirm={handleClear}
        onCancel={() => setShowClearConfirm(false)}
        theme={theme}
      />

      {/* Delete Modals */}
      <ConfirmDeleteModal
        visible={confirmDelete.visible}
        title={confirmDelete.title}
        onConfirm={handleConfirmDelete}
        onCancel={() =>
          setConfirmDelete({ visible: false, songId: null, title: "" })
        }
        theme={theme}
      />

      <ConfirmDeleteAllModal
        visible={confirmDeleteAll}
        count={savedSongs.length}
        onConfirm={handleConfirmDeleteAll}
        onCancel={() => setConfirmDeleteAll(false)}
        theme={theme}
      />

      {/* Toast & Milestone */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        theme={theme}
      />

      <MilestoneModal
        visible={milestoneToast.visible}
        count={milestoneToast.count}
        isLimit={milestoneToast.isLimit}
        locked={milestoneLocked}
        chordColor={chordColor}
        theme={theme}
        onClose={closeMilestoneToast}
      />

      <SupportBanner theme={theme} darkMode={darkMode} />
      <Footer theme={theme} darkMode={darkMode} chordColor={chordColor} />
    </div>
  );
}
