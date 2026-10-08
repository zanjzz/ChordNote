var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/pages-JPhTAZ/functionsWorker-0.47751615596512365.mjs
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var NAMED_ENTITIES = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  // smart single quotes / apostrophes
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
  "&sbquo;": "\u201A",
  // smart double quotes
  "&rdquo;": "\u201D",
  "&ldquo;": "\u201C",
  "&bdquo;": "\u201E",
  // dashes & ellipsis
  "&ndash;": "\u2013",
  "&mdash;": "\u2014",
  "&hellip;": "\u2026",
  "&minus;": "\u2212",
  // misc common ones
  "&copy;": "\xA9",
  "&reg;": "\xAE",
  "&trade;": "\u2122",
  "&deg;": "\xB0",
  "&bull;": "\u2022",
  "&middot;": "\xB7"
};
function decodeEntities(str = "") {
  let out = str;
  out = out.replace(/&[a-z]+;/gi, (m) => {
    const key = m.toLowerCase();
    return NAMED_ENTITIES[key] !== void 0 ? NAMED_ENTITIES[key] : m;
  });
  out = out.replace(/&#0*(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10))).replace(
    /&#x([0-9a-f]+);/gi,
    (_, n) => String.fromCodePoint(parseInt(n, 16))
  );
  return out;
}
__name(decodeEntities, "decodeEntities");
__name2(decodeEntities, "decodeEntities");
function stripTags(html = "") {
  return decodeEntities(html.replace(/<[^>]*>/g, ""));
}
__name(stripTags, "stripTags");
__name2(stripTags, "stripTags");
function normalizeChart(text = "") {
  return text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.replace(/[ \t]+$/g, "")).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
__name(normalizeChart, "normalizeChart");
__name2(normalizeChart, "normalizeChart");
function extractTitleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]).trim() : "";
}
__name(extractTitleTag, "extractTitleTag");
__name2(extractTitleTag, "extractTitleTag");
function extractMeta(html, property) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}
__name(extractMeta, "extractMeta");
__name2(extractMeta, "extractMeta");
var SECTION_KEYWORDS = [
  "intro",
  "verse",
  "pre-chorus",
  "prechorus",
  "chorus",
  "post-chorus",
  "bridge",
  "interlude",
  "instrumental",
  "refrain",
  "tag",
  "vamp",
  "outro",
  "ending",
  "coda",
  "hook",
  "solo",
  "breakdown",
  "turnaround",
  "reprise"
];
var SECTION_LINE_REGEX = new RegExp(
  `^\\s*(${SECTION_KEYWORDS.join("|")})(?:\\s*[-\u2013\u2014]?\\s*\\d+)?(?:\\s*\\(?\\s*(?:x\\s*\\d+|\\d+\\s*x)\\s*\\)?)?\\s*$`,
  "i"
);
function normalizeSectionLabels(text = "") {
  return text.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    const bracketed = trimmed.match(/^\[+\s*(.*?)\s*\]+$/);
    if (bracketed) {
      const inner = bracketed[1].trim();
      return inner ? `[${inner}]` : line;
    }
    if (SECTION_LINE_REGEX.test(trimmed)) {
      return `[${trimmed.replace(/\s+/g, " ")}]`;
    }
    return line;
  }).join("\n");
}
__name(normalizeSectionLabels, "normalizeSectionLabels");
__name2(normalizeSectionLabels, "normalizeSectionLabels");
function makeSong({ title = "", artist = "", sections = [], chordChart = "" }) {
  return { title, artist, sections, chordChart };
}
__name(makeSong, "makeSong");
__name2(makeSong, "makeSong");
var ImportError = class extends Error {
  static {
    __name(this, "ImportError");
  }
  static {
    __name2(this, "ImportError");
  }
  constructor(code, message) {
    super(message);
    this.code = code;
  }
};
function canHandle(hostname) {
  return /(^|\.)ultimate-guitar\.com$/i.test(hostname);
}
__name(canHandle, "canHandle");
__name2(canHandle, "canHandle");
function stripUGMarkup(tab) {
  return tab.replace(/\[\/?ch\]/gi, "").replace(/\[\/?tab\]/gi, "");
}
__name(stripUGMarkup, "stripUGMarkup");
__name2(stripUGMarkup, "stripUGMarkup");
function parse(html) {
  const m = html.match(/data-content=["']([\s\S]*?)["']\s*>/i);
  if (!m) {
    throw new ImportError(
      "PARSE_FAILED",
      "Couldn't read the Ultimate Guitar page. It may have changed format \u2014 try pasting the chords as text instead."
    );
  }
  let store;
  try {
    store = JSON.parse(decodeEntities(m[1]));
  } catch (_) {
    throw new ImportError(
      "PARSE_FAILED",
      "Couldn't parse the Ultimate Guitar data. Try pasting the chords as text instead."
    );
  }
  const page = store?.store?.page?.data || store?.page?.data || {};
  const tabView = page.tab_view || {};
  const meta = page.tab || {};
  const content = tabView?.wiki_tab?.content || tabView?.content || "";
  if (!content) {
    throw new ImportError(
      "NO_CHORD_DATA",
      "That Ultimate Guitar page doesn't contain chord data (it may be a video or Pro tab)."
    );
  }
  const chordChart = normalizeChart(stripUGMarkup(decodeEntities(content)));
  return makeSong({
    title: meta.song_name || "",
    artist: meta.artist_name || "",
    chordChart
  });
}
__name(parse, "parse");
__name2(parse, "parse");
var ultimateGuitarImporter_default = { canHandle, parse };
function splitTitleArtist(raw) {
  if (!raw) return { title: "", artist: "" };
  let s = raw.replace(/\s*(chords|tab|lyrics)\s*$/i, "").trim();
  let m = s.match(/^(.*?)\s+by\s+(.*)$/i);
  if (m) return { title: m[1].trim(), artist: m[2].trim() };
  m = s.match(/^(.*?)\s*[-–—]\s*(.*)$/);
  if (m) return { title: m[1].trim(), artist: m[2].trim() };
  return { title: s, artist: "" };
}
__name(splitTitleArtist, "splitTitleArtist");
__name2(splitTitleArtist, "splitTitleArtist");
function canHandle2() {
  return true;
}
__name(canHandle2, "canHandle2");
__name2(canHandle2, "canHandle");
function parse2(html) {
  const preBlocks = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)].map(
    (m) => m[1]
  );
  let best = "";
  let bestScore = -1;
  for (const block of preBlocks) {
    const text = normalizeChart(stripTags(block));
    const score = (text.match(/\n/g) || []).length;
    if (score > bestScore && text.trim()) {
      best = text;
      bestScore = score;
    }
  }
  if (!best || bestScore < 1) {
    throw new ImportError(
      "NO_CHORD_DATA",
      "Couldn't find a chord chart on that page. Try copying the chords and pasting them as text instead."
    );
  }
  const rawTitle = extractMeta(html, "og:title") || extractTitleTag(html);
  const { title, artist } = splitTitleArtist(rawTitle);
  return makeSong({ title, artist, chordChart: best });
}
__name(parse2, "parse2");
__name2(parse2, "parse");
var genericImporter_default = { canHandle: canHandle2, parse: parse2 };
var INLINE_CHORD_REGEX = /\[[^\]]+\]/;
function isChordPro(text) {
  if (!text) return false;
  return text.split("\n").some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^\[[^\]]+\]$/.test(trimmed)) return false;
    return INLINE_CHORD_REGEX.test(trimmed);
  });
}
__name(isChordPro, "isChordPro");
__name2(isChordPro, "isChordPro");
var SECTION_DIRECTIVES = {
  start_of_chorus: "Chorus",
  soc: "Chorus",
  start_of_verse: "Verse",
  sov: "Verse",
  start_of_bridge: "Bridge",
  sob: "Bridge",
  chorus: "Chorus"
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
    lyricLine: lyric.replace(/\s+$/, "")
  };
}
__name(convertInlineLine, "convertInlineLine");
__name2(convertInlineLine, "convertInlineLine");
function convertChordPro(text) {
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
__name(convertChordPro, "convertChordPro");
__name2(convertChordPro, "convertChordPro");
function extractChordProMeta(text) {
  const meta = { title: "", artist: "", key: "" };
  if (!text) return meta;
  text.split("\n").forEach((line) => {
    const m = line.trim().match(/^\{\s*([^:}]+?)\s*:\s*(.*?)\s*\}$/);
    if (!m) return;
    const name = m[1].toLowerCase().replace(/[\s-]+/g, "_");
    const value = m[2].trim();
    if (!value) return;
    if ((name === "title" || name === "t") && !meta.title) meta.title = value;
    else if ((name === "subtitle" || name === "st" || name === "artist") && !meta.artist)
      meta.artist = value;
    else if (name === "key" && !meta.key) meta.key = value;
  });
  return meta;
}
__name(extractChordProMeta, "extractChordProMeta");
__name2(extractChordProMeta, "extractChordProMeta");
var SITE_IMPORTERS = [ultimateGuitarImporter_default];
function getImporter(hostname) {
  for (const importer of SITE_IMPORTERS) {
    try {
      if (importer.canHandle(hostname)) return importer;
    } catch (_) {
    }
  }
  return genericImporter_default;
}
__name(getImporter, "getImporter");
__name2(getImporter, "getImporter");
function parseHtml(hostname, html) {
  const importer = getImporter(hostname);
  const song = importer.parse(html);
  let chart = song.chordChart || "";
  let title = song.title || "";
  let artist = song.artist || "";
  if (isChordPro(chart)) {
    const meta = extractChordProMeta(chart);
    if (!title && meta.title) title = meta.title;
    if (!artist && meta.artist) artist = meta.artist;
    chart = convertChordPro(chart);
  }
  chart = normalizeSectionLabels(chart);
  return { ...song, title, artist, chordChart: chart };
}
__name(parseHtml, "parseHtml");
__name2(parseHtml, "parseHtml");
var FETCH_TIMEOUT_MS = 12e3;
var MAX_BYTES = 4 * 1024 * 1024;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
__name(json, "json");
__name2(json, "json");
function fail(code, message, status) {
  return json({ error: message, code }, status);
}
__name(fail, "fail");
__name2(fail, "fail");
function isDisallowedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) {
    const [a, b] = h.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  return false;
}
__name(isDisallowedHost, "isDisallowedHost");
__name2(isDisallowedHost, "isDisallowedHost");
async function handleImport(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return fail("INVALID_REQUEST", "Invalid request body.", 400);
  }
  const rawUrl = (payload?.url || "").trim();
  if (!rawUrl) {
    return fail("INVALID_URL", "No URL was provided.", 400);
  }
  let url;
  try {
    url = new URL(rawUrl);
  } catch (_) {
    return fail("INVALID_URL", "That doesn't look like a valid URL.", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return fail("INVALID_URL", "Only http and https links are supported.", 400);
  }
  if (isDisallowedHost(url.hostname)) {
    return fail("INVALID_URL", "That URL can't be imported.", 400);
  }
  let html;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // Look like a real browser — many sites 403 default fetch agents.
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });
    clearTimeout(timer);
    if (!res.ok) {
      return fail(
        "SITE_UNAVAILABLE",
        `The website returned an error (${res.status}). It may be down or blocking imports.`,
        502
      );
    }
    const contentType = res.headers.get("content-type") || "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      return fail(
        "UNSUPPORTED",
        "That link isn't a web page we can read.",
        415
      );
    }
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const merged = new Uint8Array(total > MAX_BYTES ? MAX_BYTES : total);
    let offset = 0;
    for (const c of chunks) {
      if (offset + c.length > merged.length) {
        merged.set(c.subarray(0, merged.length - offset), offset);
        break;
      }
      merged.set(c, offset);
      offset += c.length;
    }
    html = new TextDecoder("utf-8").decode(merged);
  } catch (err) {
    if (err?.name === "AbortError") {
      return fail(
        "SITE_UNAVAILABLE",
        "The website took too long to respond. Please try again.",
        504
      );
    }
    return fail(
      "SITE_UNAVAILABLE",
      "Couldn't reach that website. Check the link and try again.",
      502
    );
  }
  try {
    const song = parseHtml(url.hostname, html);
    if (!song.chordChart || !song.chordChart.trim()) {
      return fail(
        "NO_CHORD_DATA",
        "No chord data was found on that page.",
        422
      );
    }
    return json(song, 200);
  } catch (err) {
    if (err instanceof ImportError) {
      const status = err.code === "NO_CHORD_DATA" ? 422 : 422;
      return fail(err.code, err.message, status);
    }
    return fail(
      "PARSE_FAILED",
      "Something went wrong reading that page. Try pasting the chords as text instead.",
      500
    );
  }
}
__name(handleImport, "handleImport");
__name2(handleImport, "handleImport");
async function onRequest(context) {
  const { request } = context;
  const method = request.method.toUpperCase();
  if (method === "POST") {
    return handleImport(request);
  }
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "86400"
      }
    });
  }
  return fail("INVALID_REQUEST", "Use POST to import a URL.", 405);
}
__name(onRequest, "onRequest");
__name2(onRequest, "onRequest");
var routes = [
  {
    routePath: "/api/import-url",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse3(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse3, "parse3");
__name2(parse3, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse3(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
var drainBody = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError2(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-QqIns2/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-QqIns2/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.47751615596512365.js.map
