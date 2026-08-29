const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

export const LANE_GLYPH =
  '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">' +
  '<path d="M1.5 1.5h13v13h-13v-13Zm1.5 1.5v10h10V3H3Z"/><path d="M5.5 5.5h5v5h-5v-5Z"/></svg>';

export const OUT_OF_SCOPE = "out-of-scope";
const BEHIND_US = "behind-us";

export const dirOf = (path) =>
  path.lastIndexOf("/") === -1 ? "" : path.slice(0, path.lastIndexOf("/"));

/** A key the reader never types can read better than it spells. */
const COLUMN_LABELS = new Map([[BEHIND_US, "Done"]]);

export const columnName = (key) => COLUMN_LABELS.get(key) || key.replace(/-/g, " ");

const ANSWER_HEAD_RE = /^ {0,3}##[ \t]+answer[ \t]*#*[ \t]*$/i;
const HEAD_RE = /^ {0,3}#{1,6}[ \t]/;
const ANSWER_MAX = 180;

const answerPlain = (line) =>
  line
    .replace(/^\s*>+\s?/, "")
    .replace(/^\s*(?:[-*+]|\d{1,9}[.)])\s+/, "")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_~]/g, "");

/**
 * A resolved ticket carries its answer under a heading, and a card reads it back as plain text.
 * Ticket markdown is untrusted, so the syntax is flattened rather than rendered.
 */
export function answerOf(body) {
  const lines = String(body == null ? "" : body).replace(/\r\n?/g, "\n").split("\n");
  const from = lines.findIndex((line) => ANSWER_HEAD_RE.test(line));
  if (from === -1) return "";
  const said = [];
  for (let n = from + 1; n < lines.length && !HEAD_RE.test(lines[n]); n += 1) {
    said.push(answerPlain(lines[n]));
  }
  const text = said.join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= ANSWER_MAX) return text;
  const cut = text.slice(0, ANSWER_MAX);
  return (cut.replace(/\s+\S*$/, "") || cut) + "\u2026";
}

/**
 * A baked board is one file, so a relative link to a path the payload holds is navigation.
 * The keys of `knownPaths` are escaped paths, because a href is already escaped by the time
 * a link is read.
 */
export function inBoardTarget(knownPaths, base, href) {
  if (!knownPaths.size) return "";
  const wanted = href.split("#")[0].split("?")[0];
  if (!wanted) return "";
  const parts = [];
  (base ? base.split("/") : []).concat(wanted.split("/")).forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") parts.pop();
    else parts.push(part);
  });
  return knownPaths.get(parts.join("/")) || "";
}

const baseOf = (group) => {
  const lead = group.files.filter((file) => file.role === "lead")[0];
  return lead ? dirOf(escapeHtml(lead.path)) : escapeHtml(group.path);
};

const ITEM_RE = /^\s*([-*+]|\d{1,9}[.)])\s+/;

/** What a fold reports is how many things it holds, so a list counts its markers. */
function countOf(source) {
  const lines = String(source == null ? "" : source).split("\n");
  const items = lines.filter((line) => ITEM_RE.test(line)).length;
  if (items) return items;
  let blocks = 0;
  let inside = false;
  lines.forEach((line) => {
    if (!line.trim()) inside = false;
    else if (!inside) {
      blocks += 1;
      inside = true;
    }
  });
  return blocks;
}

function foldHtml(name, count, body) {
  return (
    '<details class="wf-fold"><summary class="wf-fold-btn">' +
    '<span class="wf-fold-name">' + escapeHtml(name) + "</span>" +
    '<span class="wf-fold-count">' + count + "</span></summary>" +
    '<div class="wf-fold-body wf-md">' + body + "</div></details>"
  );
}

function rowHtml(file) {
  return (
    '<li class="wf-row" data-path="' + escapeHtml(file.path) + '"' +
    (file.id ? ' data-id="' + escapeHtml(file.id) + '"' : "") + ">" +
    (file.id ? '<span class="wf-row-id">' + escapeHtml(file.id) + "</span>" : "") +
    (file.type ? '<span class="wf-row-type">' + escapeHtml(file.type) + "</span>" : "") +
    '<h3 class="wf-row-title"><button type="button" class="wf-card-open" aria-haspopup="dialog">' +
    escapeHtml(file.title) + "</button></h3></li>"
  );
}

export const rowsHtml = (files) =>
  files.length ? '<ol class="wf-list">' + files.map(rowHtml).join("") + "</ol>" : "";

function docsHtml(group, markdownHtml) {
  return group.files
    .filter((file) => file.role === "other")
    .map(
      (file) =>
        '<details class="wf-doc"><summary class="wf-doc-btn">' + escapeHtml(file.title) + "</summary>" +
        '<div class="wf-doc-body wf-md">' + markdownHtml(dirOf(escapeHtml(file.path)), file.body) + "</div></details>"
    )
    .join("");
}

/** The lead document is a document like any other, so its title opens the same panel. */
function leadTitle(group, lead) {
  if (!lead) return escapeHtml(group.title);
  return (
    '<button type="button" class="wf-card-open" aria-haspopup="dialog">' +
    escapeHtml(group.title) + "</button>"
  );
}

/** `markdownHtml(base, source)` comes in, because a link resolves against the payload. */
export function headHtml(group, markdownHtml) {
  const base = baseOf(group);
  const lead = group.files.filter((file) => file.role === "lead")[0] || null;
  const sections = group.sections;
  const opening = sections.destination || (group.kind === "context" && lead ? lead.body : "");
  const spare = group.files.filter((file) => file.state === OUT_OF_SCOPE);
  const docs = group.files.filter((file) => file.role === "other");
  const folds = [];

  if (sections.notes) folds.push(foldHtml("notes", countOf(sections.notes), markdownHtml(base, sections.notes)));
  if (sections.fog) {
    folds.push(foldHtml("not yet specified", countOf(sections.fog), markdownHtml(base, sections.fog)));
  }
  if (sections.outOfScope || spare.length) {
    folds.push(
      foldHtml(
        "out of scope",
        countOf(sections.outOfScope) + spare.length,
        (sections.outOfScope ? markdownHtml(base, sections.outOfScope) : "") + rowsHtml(spare)
      )
    );
  }
  if (docs.length && group.kind !== "context") {
    folds.push(foldHtml("documents", docs.length, docsHtml(group, markdownHtml)));
  }

  return (
    '<header class="wf-head"' + (lead ? ' data-path="' + escapeHtml(lead.path) + '"' : "") + ">" +
    '<h1 class="wf-head-title">' + leadTitle(group, lead) + "</h1>" +
    (opening ? '<div class="wf-dest wf-md">' + markdownHtml(base, opening) + "</div>" : "") +
    (folds.length ? '<div class="wf-folds">' + folds.join("") + "</div>" : "") +
    "</header>"
  );
}

export function cardHtmlFor(file) {
  const answer = file.state === BEHIND_US ? answerOf(file.body) : "";
  return (
    '<li class="wf-card" data-path="' + escapeHtml(file.path) + '"' +
    (file.id ? ' data-id="' + escapeHtml(file.id) + '"' : "") +
    ' data-state="' + escapeHtml(file.state) + '"' +
    (file.claimed ? ' data-claimed="true"' : "") + ">" +
    '<div class="wf-card-top">' +
    (file.type ? '<span class="wf-card-type">' + escapeHtml(file.type) + "</span>" : "") +
    (file.claimed ? '<span class="wf-card-claim">claimed</span>' : "") +
    (file.id ? '<span class="wf-card-id">' + escapeHtml(file.id) + "</span>" : "") +
    "</div>" +
    '<h3 class="wf-card-title"><button type="button" class="wf-card-open" aria-haspopup="dialog">' +
    escapeHtml(file.title) + "</button></h3>" +
    (answer ? '<p class="wf-card-answer">' + escapeHtml(answer) + "</p>" : "") +
    "</li>"
  );
}

export function columnHtml(group, key) {
  const files = group.files.filter((file) => file.state === key);
  const claimed = key === "takeable-now" ? files.filter((file) => file.claimed).length : 0;
  const foldable = key === BEHIND_US;
  return (
    '<section class="wf-col" data-state="' + key + '"' +
    ' aria-label="' + columnName(key) + '">' +
    '<header class="wf-col-head">' +
    '<span class="wf-col-glyph" aria-hidden="true">' + LANE_GLYPH + "</span>" +
    '<h2 class="wf-col-name">' + columnName(key) + "</h2>" +
    '<span class="wf-col-count">' + (files.length - claimed) + "</span>" +
    (claimed ? '<span class="wf-col-claimed">+' + claimed + " claimed</span>" : "") +
    (foldable
      ? '<button type="button" class="wf-col-toggle" aria-expanded="true">' +
        '<span class="wf-col-toggle-txt wf-col-toggle-show">show tickets</span>' +
        '<span class="wf-col-toggle-txt wf-col-toggle-collapse">collapse</span></button>'
      : "") +
    "</header>" +
    '<ol class="wf-col-list">' + files.map(cardHtmlFor).join("") + "</ol></section>"
  );
}

/** The edge list comes in, because the walk answers a question about the payload, not the page. */
export function downstreamOf(edges, path) {
  const keep = new Set([path]);
  let grew = true;
  while (grew) {
    grew = false;
    edges.forEach((edge) => {
      if (keep.has(edge.from) && !keep.has(edge.to)) {
        keep.add(edge.to);
        grew = true;
      }
    });
  }
  return keep;
}

/** A column of its own has no room between the ends, so a same-column edge bulges past them. */
export const EDGE_BULGE = 34;

/** Two boxes off the layout in, one path string out, so the curve is testable without a page. */
export function edgeShape(p, q) {
  const y1 = Math.round(p.y + p.h / 2);
  const y2 = Math.round(q.y + q.h / 2);
  if (p.column === q.column) {
    const x = Math.round(p.x + p.w);
    const bulge = x + EDGE_BULGE;
    return "M" + x + " " + y1 + " C" + bulge + " " + y1 + " " + bulge + " " + y2 + " " + x + " " + y2;
  }
  const x1 = Math.round(p.x + p.w);
  const x2 = Math.round(q.x);
  const mid = Math.round((x1 + x2) / 2);
  return "M" + x1 + " " + y1 + " C" + mid + " " + y1 + " " + mid + " " + y2 + " " + x2 + " " + y2;
}

/** A rank an edge never draws on. */
export const EDGE_HIDDEN = -1;

/**
 * A hover reveals the edges into the card and every edge out of it, and each one waits its turn.
 * The rank is how many blockers a line starts away from the card, so the drawing grows outward.
 */
export function revealRanks(edges, path) {
  const depth = new Map([[path, 0]]);
  let grew = true;
  while (grew) {
    grew = false;
    edges.forEach((edge) => {
      const from = depth.get(edge.from);
      if (from === undefined) return;
      const to = depth.get(edge.to);
      if (to === undefined || to > from + 1) {
        depth.set(edge.to, from + 1);
        grew = true;
      }
    });
  }
  return edges.map((edge) => {
    if (edge.to === path) return 0;
    const from = depth.get(edge.from);
    return from === undefined ? EDGE_HIDDEN : from;
  });
}
