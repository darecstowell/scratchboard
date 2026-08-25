const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*\S*\s*$/;
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const HR_RE = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
const QUOTE_RE = /^ {0,3}>/;
const DIVIDER_RE = /^ {0,3}\|?[ :|-]*-[ :|-]*$/;
const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/)/i;

function renderInline(text, resolveLink) {
  const held = [];
  const hold = (html) => "\u0000" + (held.push(html) - 1) + "\u0000";

  let work = String(text).replace(/\\([\\`*_{}[\]()#+\-.!~|>])/g, (_, ch) => hold(esc(ch)));
  work = work.replace(/(`+)([^`\n]+)\1/g, (_, __, code) => hold("<code>" + esc(code) + "</code>"));
  work = esc(work);
  work = work.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  work = work.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  work = work.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
  work = work.replace(/\[([^\]\n]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (whole, label, href) => {
    if (!SAFE_HREF.test(href)) {
      const inBoard = resolveLink(href);
      if (!inBoard) return whole;
      return hold('<button type="button" class="md-link" data-open="' + esc(inBoard) + '">' + label + "</button>");
    }
    return hold('<a href="' + href + '" target="_blank" rel="noreferrer">' + label + "</a>");
  });
  work = work.replace(/(^|[\s(])(https?:\/\/[^\s<>()]+[^\s<>().,;:])/g, (_, lead, url) =>
    lead + hold('<a href="' + url + '" target="_blank" rel="noreferrer">' + url + "</a>")
  );

  for (let pass = 0; pass < 4 && work.indexOf("\u0000") !== -1; pass++) {
    work = work.replace(/\u0000(\d+)\u0000/g, (_, n) => held[Number(n)]);
  }
  return work;
}

const isOrdered = (marker) => /\d/.test(marker);
const indentOf = (line) => {
  const at = line.search(/\S/);
  return at === -1 ? 0 : at;
};

function startsBlock(line) {
  return (
    !line.trim() ||
    FENCE_RE.test(line) ||
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    LIST_RE.test(line)
  );
}

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(lines, from, resolveLink) {
  const head = cells(lines[from]);
  let i = from + 2;
  let html = "<table><thead><tr>";
  head.forEach((cell) => (html += "<th>" + renderInline(cell, resolveLink) + "</th>"));
  html += "</tr></thead><tbody>";
  while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
    html += "<tr>";
    cells(lines[i]).forEach((cell) => (html += "<td>" + renderInline(cell, resolveLink) + "</td>"));
    html += "</tr>";
    i++;
  }
  return { html: html + "</tbody></table>", next: i };
}

function renderItem(lines, contentIndent, resolveLink) {
  const body = lines.map((line, index) => {
    if (index === 0) return line;
    const strip = Math.min(contentIndent, indentOf(line));
    return line.slice(strip);
  });

  let split = 1;
  while (split < body.length && !startsBlock(body[split])) split++;

  let lead = body.slice(0, split).join("\n").trim();
  let box = "";
  const task = /^\[([ xX])\]\s+/.exec(lead);
  if (task) {
    box = '<input type="checkbox" disabled' + (task[1] === " " ? "" : " checked") + " />";
    lead = lead.slice(task[0].length);
  }
  return "<li>" + box + renderInline(lead, resolveLink) + renderBlocks(body.slice(split), resolveLink) + "</li>";
}

function renderList(lines, from, resolveLink) {
  const first = LIST_RE.exec(lines[from]);
  const base = first[1].length;
  const ordered = isOrdered(first[2]);
  const items = [];
  const indents = [];
  let current = null;
  let blank = false;
  let i = from;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      let peek = i + 1;
      while (peek < lines.length && !lines[peek].trim()) peek++;
      if (peek >= lines.length) break;
      const nextItem = LIST_RE.exec(lines[peek]);
      const deeper = indentOf(lines[peek]) > base;
      if (!deeper && !(nextItem && nextItem[1].length === base && isOrdered(nextItem[2]) === ordered)) break;
      blank = true;
      i = peek;
      continue;
    }

    const match = LIST_RE.exec(line);
    if (match && match[1].length <= base) {
      if (match[1].length < base || isOrdered(match[2]) !== ordered) break;
      current = [match[4]];
      items.push(current);
      indents.push(match[1].length + match[2].length + match[3].length);
      blank = false;
      i++;
      continue;
    }
    if (!current) break;
    if (indentOf(line) <= base && startsBlock(line)) break;
    if (blank) {
      current.push("");
      blank = false;
    }
    current.push(line);
    i++;
  }

  const tag = ordered ? "ol" : "ul";
  const start = ordered ? parseInt(first[2], 10) : 1;
  const open = ordered && start !== 1 ? '<ol start="' + start + '">' : "<" + tag + ">";
  const html =
    open + items.map((item, index) => renderItem(item, indents[index], resolveLink)).join("") + "</" + tag + ">";
  return { html, next: i };
}

function renderBlocks(lines, resolveLink) {
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const closer = new RegExp("^ {0,3}\\" + fence[1][0] + "{" + fence[1].length + ",}\\s*$");
      const code = [];
      i++;
      while (i < lines.length && !closer.test(lines[i])) code.push(lines[i++]);
      i++;
      html += "<pre><code>" + esc(code.join("\n")) + "</code></pre>";
      continue;
    }

    if (HR_RE.test(line)) {
      html += "<hr />";
      i++;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      html += "<h" + level + ">" + renderInline(heading[2], resolveLink) + "</h" + level + ">";
      i++;
      continue;
    }

    if (QUOTE_RE.test(line)) {
      const quoted = [];
      while (i < lines.length && lines[i].trim() && !HR_RE.test(lines[i])) {
        quoted.push(lines[i].replace(/^ {0,3}> ?/, ""));
        i++;
      }
      html += "<blockquote>" + renderBlocks(quoted, resolveLink) + "</blockquote>";
      continue;
    }

    if (
      line.indexOf("|") !== -1 &&
      i + 1 < lines.length &&
      lines[i + 1].indexOf("|") !== -1 &&
      DIVIDER_RE.test(lines[i + 1])
    ) {
      const table = renderTable(lines, i, resolveLink);
      html += table.html;
      i = table.next;
      continue;
    }

    if (LIST_RE.test(line)) {
      const list = renderList(lines, i, resolveLink);
      html += list.html;
      i = list.next;
      continue;
    }

    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) {
      const next = lines[i + 1];
      if (paragraph.length && next && lines[i].indexOf("|") !== -1 && DIVIDER_RE.test(next) && next.indexOf("|") !== -1) break;
      paragraph.push(lines[i]);
      i++;
    }
    if (!paragraph.length) {
      paragraph.push(lines[i]);
      i++;
    }
    html += "<p>" + renderInline(paragraph.join("\n"), resolveLink) + "</p>";
  }

  return html;
}

/** `resolveLink(href)` answers with an in-board path, or with an empty string for a link out. */
export function renderMarkdown(source, resolveLink) {
  const resolve = typeof resolveLink === "function" ? resolveLink : () => "";
  return renderBlocks(String(source == null ? "" : source).replace(/\r\n?/g, "\n").split("\n"), resolve);
}
