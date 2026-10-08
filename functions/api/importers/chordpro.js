// functions/api/importers/chordpro.js
//
// Server-side mirror of src/utils/chordpro.js. Kept identical in logic so
// a fetched ChordPro page converts the same way a pasted one does. Runs on
// the Cloudflare Workers runtime (pure string work, no deps).
//
// Converts inline ChordPro ("Walk[G]ing in the [C]light") into ChordNote's
// two-line format (chord row space-aligned above the lyric row).

const INLINE_CHORD_REGEX = /\[[^\]]+\]/;

export function isChordPro(text) {
  if (!text) return false;
  return text.split("\n").some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\[[^\]]+\]$/.test(trimmed)) return false;
    return INLINE_CHORD_REGEX.test(trimmed);
  });
}

const SECTION_DIRECTIVES = {
  start_of_chorus: "Chorus",
  soc: "Chorus",
  start_of_verse: "Verse",
  sov: "Verse",
  start_of_bridge: "Bridge",
  sob: "Bridge",
  chorus: "Chorus",
};

function convertInlineLine(line) {
  let lyric = "";
  let chordRow = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "[") {
      const close = line.indexOf("]", i);
      if (close === -1) {
        lyric += line.slice(i);
        break;
      }
      const chord = line.slice(i + 1, close);
      if (chordRow.length > lyric.length) chordRow += " ";
      while (chordRow.length < lyric.length) chordRow += " ";
      chordRow += chord;
      i = close + 1;
    } else {
      lyric += line[i];
      i += 1;
    }
  }

  return {
    chordLine: chordRow.replace(/\s+$/, ""),
    lyricLine: lyric.replace(/\s+$/, ""),
  };
}

export function convertChordPro(text) {
  if (!text) return text;
  const out = [];

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();

    const directive = trimmed.match(/^\{\s*([^:}]+?)\s*(?::\s*(.*?))?\s*\}$/);
    if (directive) {
      const name = directive[1].toLowerCase().replace(/[\s-]+/g, "_");
      const value = (directive[2] || "").trim();
      if ((name === "section" || name === "sec") && value) {
        out.push(`[${value}]`);
      } else if (SECTION_DIRECTIVES[name]) {
        out.push(`[${value || SECTION_DIRECTIVES[name]}]`);
      } else if (name === "comment" || name === "c") {
        if (value) out.push(`[${value}]`);
      }
      return;
    }

    if (/^\[[^\]]+\]$/.test(trimmed)) {
      out.push(trimmed);
      return;
    }

    if (!trimmed) {
      out.push("");
      return;
    }

    if (INLINE_CHORD_REGEX.test(line)) {
      const { chordLine, lyricLine } = convertInlineLine(line);
      if (chordLine.trim()) out.push(chordLine);
      out.push(lyricLine);
      return;
    }

    out.push(line);
  });

  return out.join("\n");
}

export function extractChordProMeta(text) {
  const meta = { title: "", artist: "", key: "" };
  if (!text) return meta;
  text.split("\n").forEach((line) => {
    const m = line.trim().match(/^\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}$/);
    if (!m) return;
    const name = m[1].toLowerCase().replace(/[\s-]+/g, "_");
    const value = m[2].trim();
    if (!value) return;
    if ((name === "title" || name === "t") && !meta.title) meta.title = value;
    else if (
      (name === "subtitle" || name === "st" || name === "artist") &&
      !meta.artist
    )
      meta.artist = value;
    else if (name === "key" && !meta.key) meta.key = value;
  });
  return meta;
}
