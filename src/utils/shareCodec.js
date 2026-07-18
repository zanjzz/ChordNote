import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from "lz-string";

// Short keys purely for the share-link payload — mapping keeps the
// actual app state (and localStorage) using full readable names, this
// translation only happens at the URL boundary.
const KEY_MAP = {
  title: "t",
  author: "a",
  bpm: "b",
  musicKey: "k",
  capo: "c",
  lyrics: "l",
  chords: "ch",
  transposeOffset: "to",
  editorFontSize: "efs",
  chordColor: "cc",
  columns: "col",
  alignment: "al",
  darkMode: "dm",
  showLineNumbers: "sln",
  chordDisplayMode: "cdm",
};

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([full, short]) => [short, full]),
);

function shortenKeys(data) {
  const out = {};
  Object.keys(data).forEach((key) => {
    const shortKey = KEY_MAP[key] || key;
    out[shortKey] = data[key];
  });
  return out;
}

function restoreKeys(data) {
  const out = {};
  Object.keys(data).forEach((key) => {
    const fullKey = REVERSE_KEY_MAP[key] || key;
    out[fullKey] = data[key];
  });
  return out;
}

export function encodeShareData(data) {
  const shortened = shortenKeys(data);
  return compressToEncodedURIComponent(JSON.stringify(shortened));
}

export function decodeShareData(encoded) {
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json) return null;
  try {
    return restoreKeys(JSON.parse(json));
  } catch (_) {
    return null;
  }
}
