import React, { useState, useEffect } from "react";
import ChordSheetEditor from "./components/ChordSheetEditor.jsx";
import LandingPage from "./components/LandingPage.jsx";
import ChartPage from "./components/ChartPage.jsx";
import { decodeShareData } from "./utils/shareCodec.js";
import "./index.css";

const VISITED_KEY = "chordnote_visited_editor";

function hasVisitedEditorBefore() {
  try {
    return localStorage.getItem(VISITED_KEY) === "true";
  } catch (_) {
    return false;
  }
}

function markEditorVisited() {
  try {
    localStorage.setItem(VISITED_KEY, "true");
  } catch (_) {}
}

function App() {
  // ── Full-page chart view (new tab) ──────────────────────────────────────
  // ?view=lyrics or ?view=chords short-circuits everything else and renders
  // the standalone ChartPage. Song data comes from the ?data= param (same
  // encoding used by the share feature).
  const params = new URLSearchParams(window.location.search);
  const viewMode = params.get("view"); // "lyrics" | "chords" | null

  if (viewMode === "lyrics" || viewMode === "chords") {
    const encoded = params.get("data");
    const song = encoded ? decodeShareData(encoded) ?? {} : {};
    return <ChartPage song={song} mode={viewMode} />;
  }

  // ── Normal editor / landing routing ─────────────────────────────────────
  const [showEditor, setShowEditor] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("editor") === "true" ||
      params.has("data") ||
      hasVisitedEditorBefore()
    );
  });

  useEffect(() => {
    const url = new URL(window.location);
    if (showEditor) {
      url.searchParams.set("editor", "true");
      markEditorVisited();
    } else {
      url.searchParams.delete("editor");
      url.searchParams.delete("data");
    }
    window.history.pushState({}, "", url);
  }, [showEditor]);

  useEffect(() => {
    const handler = () => {
      const params = new URLSearchParams(window.location.search);
      setShowEditor(params.get("editor") === "true" || params.has("data"));
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  return (
    <main>
      {showEditor ? (
        <ChordSheetEditor onGoHome={() => setShowEditor(false)} />
      ) : (
        <LandingPage onOpenEditor={() => setShowEditor(true)} />
      )}
    </main>
  );
}

export default App;
