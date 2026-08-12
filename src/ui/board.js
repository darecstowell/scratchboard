(() => {
  "use strict";

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const ACCENTS = new Set(["red", "amber", "cyan", "green", "neutral"]);
  const CHIP_MAX = 6;
  const DROPDOWN_AT = 12;
  const LANE_GLYPH =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">' +
    '<path d="M1.5 1.5h13v13h-13v-13Zm1.5 1.5v10h10V3H3Z"/><path d="M5.5 5.5h5v5h-5v-5Z"/></svg>';

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

  // ------------------------------------------------------------- markdown

  const LIST_RE = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(.*)$/;
  const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*\S*\s*$/;
  const HEADING_RE = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
  const HR_RE = /^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/;
  const QUOTE_RE = /^ {0,3}>/;
  const DIVIDER_RE = /^ {0,3}\|?[ :|-]*-[ :|-]*$/;
  const SAFE_HREF = /^(https?:\/\/|mailto:|#|\/)/i;

  function renderInline(text) {
    const held = [];
    const hold = (html) => "\u0000" + (held.push(html) - 1) + "\u0000";

    let work = String(text).replace(/\\([\\`*_{}\[\]()#+\-.!~|>])/g, (_, ch) => hold(esc(ch)));
    work = work.replace(/(`+)([^`\n]+)\1/g, (_, __, code) => hold("<code>" + esc(code) + "</code>"));
    work = esc(work);
    work = work.replace(/~~([^~]+)~~/g, "<del>$1</del>");
    work = work.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
    work = work.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>");
    work = work.replace(/\[([^\]\n]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)/g, (whole, label, href) => {
      if (!SAFE_HREF.test(href)) return whole;
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

  function renderTable(lines, from) {
    const head = cells(lines[from]);
    let i = from + 2;
    let html = "<table><thead><tr>";
    head.forEach((cell) => (html += "<th>" + renderInline(cell) + "</th>"));
    html += "</tr></thead><tbody>";
    while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
      html += "<tr>";
      cells(lines[i]).forEach((cell) => (html += "<td>" + renderInline(cell) + "</td>"));
      html += "</tr>";
      i++;
    }
    return { html: html + "</tbody></table>", next: i };
  }

  function renderItem(lines, contentIndent) {
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
    return "<li>" + box + renderInline(lead) + renderBlocks(body.slice(split)) + "</li>";
  }

  function renderList(lines, from) {
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
    const html = open + items.map((item, index) => renderItem(item, indents[index])).join("") + "</" + tag + ">";
    return { html, next: i };
  }

  function renderBlocks(lines) {
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
        html += "<h" + level + ">" + renderInline(heading[2]) + "</h" + level + ">";
        i++;
        continue;
      }

      if (QUOTE_RE.test(line)) {
        const quoted = [];
        while (i < lines.length && lines[i].trim() && !HR_RE.test(lines[i])) {
          quoted.push(lines[i].replace(/^ {0,3}> ?/, ""));
          i++;
        }
        html += "<blockquote>" + renderBlocks(quoted) + "</blockquote>";
        continue;
      }

      if (
        line.indexOf("|") !== -1 &&
        i + 1 < lines.length &&
        lines[i + 1].indexOf("|") !== -1 &&
        DIVIDER_RE.test(lines[i + 1])
      ) {
        const table = renderTable(lines, i);
        html += table.html;
        i = table.next;
        continue;
      }

      if (LIST_RE.test(line)) {
        const list = renderList(lines, i);
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
      html += "<p>" + renderInline(paragraph.join("\n")) + "</p>";
    }

    return html;
  }

  const renderMarkdown = (source) => renderBlocks(String(source == null ? "" : source).replace(/\r\n?/g, "\n").split("\n"));

  // ------------------------------------------------------------- elements

  const el = {
    boardTitle: document.querySelector("[data-board-title]"),
    headCounts: document.getElementById("hd-counts"),
    notice: document.getElementById("notice"),
    search: document.getElementById("search-input"),
    sort: document.getElementById("sort-select"),
    sortById: document.getElementById("sort-by-id"),
    sortLabel: document.getElementById("sort-label"),
    lanes: document.getElementById("lanes"),
    board: document.querySelector(".board"),
    boardEmpty: document.getElementById("board-empty"),
    clear: document.getElementById("clear-filters"),
    detail: document.getElementById("detail"),
    detailClose: document.getElementById("detail-close"),
    detailCopy: document.getElementById("detail-copy"),
    detailFacts: document.querySelector(".detail-facts"),
    detailBody: document.querySelector("[data-detail-body]"),
    bar: document.querySelector(".bar"),
    header: document.querySelector(".hd")
  };

  const state = {
    q: "",
    needle: "",
    facets: new Map(),
    sort: "updated",
    open: new Set()
  };

  let lanes = [];
  let laneByName = new Map();
  let byPath = new Map();
  let byId = new Map();
  let facets = [];
  let facetByField = new Map();
  let badgeFacet = null;
  let hasIds = false;
  let warnings = [];
  let drops = [];
  let opener = null;
  let openPath = null;
  let openLabel = "";
  let notesButton = null;
  let noticeTimer = null;
  let painted = false;

  // ------------------------------------------------------------- values

  function fieldValues(ticket, field) {
    const raw = ticket.fields ? ticket.fields[field] : undefined;
    if (raw === undefined || raw === null) return [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    const one = String(raw);
    return one ? [one] : [];
  }

  const isListField = (ticket, field) => Array.isArray(ticket.fields && ticket.fields[field]);

  function accentOf(facet, value) {
    if (!facet || !facet.colors) return "neutral";
    const named = facet.colors[value];
    return ACCENTS.has(named) ? named : "neutral";
  }

  function compareIds(a, b) {
    if (a === b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na < nb ? -1 : 1;
    return a < b ? -1 : 1;
  }

  // ------------------------------------------------------------- cards

  function shortDate(iso) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!parts) return String(iso || "");
    return MONTHS[Number(parts[2]) - 1] + " " + parts[3];
  }

  function cardHtml(ticket) {
    const badgeValue = badgeFacet ? fieldValues(ticket, badgeFacet.field)[0] : "";
    const accent = badgeValue ? accentOf(badgeFacet, badgeValue) : "";
    const mark = badgeValue
      ? '<span class="badge" data-accent="' + accent + '">' + esc(badgeValue) + "</span>"
      : "";

    const tags = [];
    const labels = [];
    facets.forEach((facet) => {
      if (facet === badgeFacet) return;
      const values = fieldValues(ticket, facet.field);
      if (!values.length) return;
      if (isListField(ticket, facet.field)) labels.push(...values);
      else tags.push('<span class="tag tkt-status">' + esc(values[0]) + "</span>");
    });
    const shown = labels
      .slice(0, 3)
      .map((label) => '<span class="tkt-label">' + esc(label) + "</span>")
      .join("");
    const more = labels.length > 3 ? '<span class="tkt-more">+' + (labels.length - 3) + "</span>" : "";
    const id = ticket.id ? '<span class="tkt-id">#' + esc(ticket.id) + "</span>" : "";

    return (
      `<li class="tkt" data-path="${esc(ticket.path)}"` +
      `${ticket.id ? ` data-id="${esc(ticket.id)}"` : ""}` +
      `${accent ? ` data-accent="${accent}"` : ""}` +
      ` data-lane="${esc(ticket.lane)}" data-updated="${esc(ticket.updated)}">` +
      `<div class="tkt-top">${mark}${id}` +
      `<time class="tkt-date" datetime="${esc(ticket.updated)}">${esc(shortDate(ticket.updated))}</time></div>` +
      `<h3 class="tkt-title"><button type="button" class="tkt-open" aria-haspopup="dialog">${esc(ticket.title)}</button></h3>` +
      `<div class="tkt-tail">${tags.join("")}<span class="tkt-labels">${shown}${more}</span></div></li>`
    );
  }

  function buildLane(lane) {
    lane.list.innerHTML = lane.records.map((record) => cardHtml(record.ticket)).join("");
    const nodes = lane.list.children;
    for (let i = 0; i < nodes.length; i++) lane.records[i].node = nodes[i];
    lane.built = true;
  }

  // ------------------------------------------------------------- filtering

  const SORTS = {
    updated: (a, b) =>
      a.ticket.updated < b.ticket.updated
        ? 1
        : a.ticket.updated > b.ticket.updated
          ? -1
          : compareIds(b.ticket.id, a.ticket.id),
    id: (a, b) => compareIds(b.ticket.id, a.ticket.id),
    title: (a, b) => a.lowTitle.localeCompare(b.lowTitle) || compareIds(a.ticket.id, b.ticket.id)
  };

  function passes(record) {
    if (state.needle && record.hay.indexOf(state.needle) === -1) return false;
    for (const [field, picked] of state.facets) {
      if (!picked.size) continue;
      let hit = false;
      for (const value of fieldValues(record.ticket, field)) {
        if (picked.has(value)) {
          hit = true;
          break;
        }
      }
      if (!hit) return false;
    }
    return true;
  }

  function filtering() {
    if (state.needle) return true;
    for (const picked of state.facets.values()) if (picked.size) return true;
    return false;
  }

  function apply() {
    const active = filtering();
    let total = 0;

    lanes.forEach((lane) => {
      let matched = 0;
      lane.records.forEach((record) => {
        const show = passes(record);
        if (show) matched++;
        if (record.node) {
          if (show) record.node.removeAttribute("hidden");
          else record.node.setAttribute("hidden", "");
        }
      });
      total += matched;
      lane.count.textContent = active ? matched + "/" + lane.records.length : String(lane.records.length);
      lane.empty.hidden = matched !== 0;
    });

    el.clear.hidden = !active;
    el.boardEmpty.hidden = total !== 0;
    writeHash();
  }

  function sortRecords() {
    const compare = SORTS[state.sort] || SORTS.updated;
    lanes.forEach((lane) => {
      lane.records.sort(compare);
      if (!lane.built) return;
      const fragment = document.createDocumentFragment();
      lane.records.forEach((record) => fragment.appendChild(record.node));
      lane.list.appendChild(fragment);
    });
  }

  // ------------------------------------------------------------- toolbar

  function chipHtml(facet, entry) {
    return (
      `<button type="button" class="fl-chip" data-value="${esc(entry.value)}"` +
      ` data-accent="${accentOf(facet, entry.value)}" aria-pressed="false"` +
      ` title="${entry.count} tickets">${esc(entry.value)}</button>`
    );
  }

  function optionHtml(entry) {
    return (
      `<li><label class="fl-opt"><input type="checkbox" value="${esc(entry.value)}" />` +
      `<span class="fl-opt-name">${esc(entry.value)}</span>` +
      `<span class="fl-opt-count">${entry.count}</span></label></li>`
    );
  }

  function makeDropdown(facet, label, values, withSearch, key) {
    const drop = document.createElement("details");
    drop.className = "fl-dd";
    drop.dataset.field = facet.field;
    const searchId = "fl-search-" + key;
    const search = withSearch
      ? `<label class="fl-dd-search" for="${searchId}"><span class="search-glyph" aria-hidden="true">/</span>` +
        `<input id="${searchId}" type="search" placeholder="filter ${values.length} ${esc(facet.field)}"` +
        ` autocomplete="off" spellcheck="false" aria-label="Filter the ${esc(facet.field)} list" /></label>`
      : "";
    drop.innerHTML =
      `<summary class="fl-dd-btn"><span class="fl-label">${esc(label)}</span>` +
      '<span class="fl-dd-val">all</span>' +
      '<span class="fl-dd-caret" aria-hidden="true">&#9662;</span></summary>' +
      `<div class="fl-dd-pop">${search}<ul class="fl-dd-list">${values.map(optionHtml).join("")}</ul></div>`;
    drops.push(drop);
    return drop;
  }

  function buildFacetControls() {
    el.bar.querySelectorAll(".fl-group, .fl-dd").forEach((node) => node.remove());
    drops = [];

    facets.forEach((facet, index) => {
      if (!facet.values.length) return;
      if (facet.values.length >= DROPDOWN_AT) {
        el.bar.insertBefore(makeDropdown(facet, facet.field, facet.values, true, index), el.sortLabel);
        return;
      }
      const group = document.createElement("div");
      group.className = "fl-group";
      group.dataset.field = facet.field;
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", "Filter by " + facet.field);
      const chips = facet.values.slice(0, CHIP_MAX);
      const rest = facet.values.slice(CHIP_MAX);
      group.innerHTML =
        `<span class="fl-label">${esc(facet.field)}</span>` + chips.map((entry) => chipHtml(facet, entry)).join("");
      if (rest.length) group.appendChild(makeDropdown(facet, "more", rest, false, index));
      el.bar.insertBefore(group, el.sortLabel);
    });
  }

  function placeDrop(drop) {
    const pop = drop.querySelector(".fl-dd-pop");
    drop.classList.remove("is-flipped");
    if (pop.getBoundingClientRect().right > window.innerWidth - 8) drop.classList.add("is-flipped");
  }

  function pickedFor(field) {
    let picked = state.facets.get(field);
    if (!picked) {
      picked = new Set();
      state.facets.set(field, picked);
    }
    return picked;
  }

  function paintDrop(drop) {
    const value = drop.querySelector(".fl-dd-val");
    const picked = [];
    drop.querySelectorAll("input[type=checkbox]").forEach((box) => {
      if (box.checked) picked.push(box.value);
    });
    drop.classList.toggle("is-active", picked.length > 0);
    value.textContent = picked.length
      ? picked.length > 1
        ? picked[0] + " +" + (picked.length - 1)
        : picked[0]
      : "all";
  }

  function paintControls() {
    el.search.value = state.q;
    el.sort.value = state.sort;
    el.bar.querySelectorAll(".fl-chip").forEach((chip) => {
      const field = chip.closest(".fl-group").dataset.field;
      chip.setAttribute("aria-pressed", pickedFor(field).has(chip.dataset.value) ? "true" : "false");
    });
    drops.forEach((drop) => {
      const picked = pickedFor(drop.dataset.field);
      drop.querySelectorAll("input[type=checkbox]").forEach((box) => {
        box.checked = picked.has(box.value);
      });
      paintDrop(drop);
    });
    lanes.forEach((lane) => {
      if (lane.collapsed) setLaneOpen(lane, state.open.has(lane.name));
    });
  }

  // ------------------------------------------------------------- lanes

  function setLaneOpen(lane, open) {
    if (!lane.collapsed) return;
    if (open) state.open.add(lane.name);
    else state.open.delete(lane.name);
    lane.section.classList.toggle("is-collapsed", !open);
    if (lane.toggle) lane.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && !lane.built) {
      buildLane(lane);
      sortRecords();
      apply();
    }
  }

  function buildBoard() {
    el.lanes.innerHTML = "";
    lanes.forEach((lane, index) => {
      const listId = "lane-list-" + index;
      const section = document.createElement("section");
      section.className = "col" + (lane.collapsed ? " is-collapsed" : "");
      section.dataset.lane = lane.name;
      section.setAttribute("aria-label", lane.name);
      section.innerHTML =
        '<header class="col-head">' +
        `<span class="col-glyph" aria-hidden="true">${LANE_GLYPH}</span>` +
        `<h2 class="col-name">${esc(lane.name)}</h2>` +
        '<span class="col-count"></span>' +
        (lane.collapsed
          ? `<button type="button" class="col-toggle" aria-expanded="false" aria-controls="${listId}">` +
            '<span class="col-toggle-txt col-toggle-show">show tickets</span>' +
            '<span class="col-toggle-txt col-toggle-collapse">collapse</span></button>'
          : "") +
        "</header>" +
        `<ol class="col-list" id="${listId}"></ol>` +
        '<p class="col-empty" hidden>none match</p>';
      el.lanes.appendChild(section);

      lane.section = section;
      lane.list = section.querySelector(".col-list");
      lane.count = section.querySelector(".col-count");
      lane.empty = section.querySelector(".col-empty");
      lane.toggle = section.querySelector(".col-toggle");
      lane.built = false;
    });
  }

  // ------------------------------------------------------------- detail

  function factRow(term, html, className) {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    if (className) dd.className = className;
    dd.innerHTML = html;
    el.detailFacts.append(dt, dd);
    return dd;
  }

  function fillRefs(ticket) {
    const refs = Array.isArray(ticket.refs) ? ticket.refs : [];
    if (!hasIds || !refs.length) return;
    const dd = factRow("refs", "", "detail-labels");
    refs.forEach((id) => {
      const target = byId.get(id);
      if (!target) {
        const inert = document.createElement("span");
        inert.className = "tag";
        inert.textContent = "#" + id + " no ticket";
        dd.appendChild(inert);
        return;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tag";
      button.style.cursor = "pointer";
      button.dataset.ref = id;
      button.title = target.title;
      button.textContent = "#" + id;
      dd.appendChild(button);
    });
  }

  function fillFacts(ticket) {
    el.detailFacts.innerHTML = "";
    factRow("lane", '<span class="detail-lane">' + esc(ticket.lane) + "</span>");
    Object.keys(ticket.fields || {}).forEach((field) => {
      const values = fieldValues(ticket, field);
      if (!values.length) return;
      if (facetByField.has(field)) {
        factRow(field, values.map((value) => '<span class="tag">' + esc(value) + "</span>").join(""), "detail-labels");
        return;
      }
      factRow(field, esc(values.join(", ")));
    });
    factRow("path", "<code data-detail-path>" + esc(ticket.path) + "</code>");
    factRow(
      "dates",
      "<span>" + esc(ticket.created) + "</span> created &middot; <span>" + esc(ticket.updated) + "</span> updated"
    );
    fillRefs(ticket);
  }

  const COPY_LABELS = { rest: "copy path", done: "copied", failed: "copy failed" };
  const COPY_REVERT_MS = 1400;
  let copyTimer = null;

  function markCopy(result) {
    clearTimeout(copyTimer);
    el.detailCopy.textContent = COPY_LABELS[result];
    el.detailCopy.classList.toggle("is-done", result === "done");
    el.detailCopy.classList.toggle("is-failed", result === "failed");
    if (result !== "rest") copyTimer = setTimeout(() => markCopy("rest"), COPY_REVERT_MS);
  }

  function copyByCommand(text) {
    const pad = document.createElement("textarea");
    pad.className = "copy-pad";
    pad.setAttribute("aria-hidden", "true");
    pad.value = text;
    el.detail.appendChild(pad);
    const focused = document.activeElement;
    pad.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (error) {
      ok = false;
    }
    pad.remove();
    if (focused && document.contains(focused)) focused.focus();
    return ok;
  }

  function copyPath() {
    const slot = el.detail.querySelector("[data-detail-path]");
    const text = slot ? slot.textContent : "";
    if (!text) return;
    const byCommand = () => markCopy(copyByCommand(text) ? "done" : "failed");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => markCopy("done"), byCommand);
      return;
    }
    byCommand();
  }

  function setSlot(name, value) {
    const slot = el.detail.querySelector("[data-detail-" + name + "]");
    if (slot) slot.textContent = value;
  }

  function showTicket(ticket) {
    const badge = el.detail.querySelector("[data-detail-badge]");
    const badgeValue = badgeFacet ? fieldValues(ticket, badgeFacet.field)[0] : "";
    if (badge) {
      badge.hidden = !badgeValue;
      badge.dataset.accent = badgeValue ? accentOf(badgeFacet, badgeValue) : "neutral";
      badge.textContent = badgeValue || "";
    }
    el.detailFacts.style.display = "";
    el.detailCopy.hidden = false;
    markCopy("rest");
    setSlot("id", ticket.id ? "#" + ticket.id : "");
    setSlot("title", ticket.title);
    fillFacts(ticket);
    el.detailBody.innerHTML = renderMarkdown(ticket.body);
    el.detailBody.scrollTop = 0;
    openPath = ticket.path;
    openLabel = ticket.id ? "#" + ticket.id : ticket.title;
    if (!el.detail.open) el.detail.showModal();
  }

  function openTicket(ticket, from) {
    if (from) opener = from;
    showTicket(ticket);
  }

  function showNotes() {
    const badge = el.detail.querySelector("[data-detail-badge]");
    if (badge) badge.hidden = true;
    el.detailFacts.style.display = "none";
    el.detailCopy.hidden = true;
    markCopy("rest");
    setSlot("id", "");
    setSlot("title", "Scan notes");
    el.detailBody.innerHTML =
      "<p>What the scan wants you to know. Every ticket it could read is on the board.</p><ul>" +
      warnings
        .map((note) => {
          const where = note && note.path ? "<code>" + esc(note.path) + "</code> " : "";
          const why = note && note.reason ? esc(note.reason) : esc(note);
          return "<li>" + where + why + "</li>";
        })
        .join("") +
      "</ul>";
    el.detailBody.scrollTop = 0;
    openPath = null;
    if (!el.detail.open) el.detail.showModal();
  }

  function showNotice(text) {
    clearTimeout(noticeTimer);
    el.notice.textContent = text;
    el.notice.hidden = false;
    noticeTimer = setTimeout(() => {
      el.notice.hidden = true;
      el.notice.textContent = "";
    }, 8000);
  }

  // ------------------------------------------------------------- hash

  function writeHash() {
    const parts = [];
    if (state.q) parts.push("q=" + encodeURIComponent(state.q));
    facets.forEach((facet) => {
      const picked = state.facets.get(facet.field);
      if (picked && picked.size) {
        parts.push("f." + encodeURIComponent(facet.field) + "=" + [...picked].map(encodeURIComponent).join(","));
      }
    });
    if (state.sort !== "updated") parts.push("sort=" + encodeURIComponent(state.sort));
    if (state.open.size) parts.push("open=" + [...state.open].map(encodeURIComponent).join(","));
    const hash = parts.length ? "#" + parts.join("&") : "";
    const next = location.pathname + location.search + hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
  }

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function readHash() {
    const raw = location.hash.replace(/^#/, "");
    const list = (value) => new Set(value ? value.split(",").filter(Boolean).map(decode) : []);
    state.q = "";
    state.needle = "";
    state.sort = "updated";
    state.facets = new Map();
    state.open = new Set();

    raw.split("&").forEach((pair) => {
      if (!pair) return;
      const cut = pair.indexOf("=");
      const key = cut === -1 ? pair : pair.slice(0, cut);
      const value = cut === -1 ? "" : pair.slice(cut + 1);
      if (key === "q") {
        state.q = decode(value);
        state.needle = state.q.trim().toLowerCase();
        return;
      }
      if (key === "sort") {
        const wanted = decode(value);
        state.sort = SORTS[wanted] ? wanted : "updated";
        return;
      }
      if (key === "open") {
        list(value).forEach((name) => {
          const lane = laneByName.get(name);
          if (lane && lane.collapsed) state.open.add(name);
        });
        return;
      }
      if (key.slice(0, 2) === "f.") {
        const field = decode(key.slice(2));
        if (facetByField.has(field)) state.facets.set(field, list(value));
      }
    });

    if (state.sort === "id" && !hasIds) state.sort = "updated";
    facets.forEach((facet) => pickedFor(facet.field));
  }

  // ------------------------------------------------------------- events

  let timer = null;
  el.search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.q = el.search.value;
      state.needle = state.q.trim().toLowerCase();
      apply();
    }, 120);
  });

  el.sort.addEventListener("change", () => {
    state.sort = SORTS[el.sort.value] ? el.sort.value : "updated";
    sortRecords();
    apply();
  });

  el.bar.addEventListener("click", (event) => {
    const chip = event.target.closest(".fl-chip");
    if (!chip) return;
    const picked = pickedFor(chip.closest(".fl-group").dataset.field);
    const value = chip.dataset.value;
    if (picked.has(value)) picked.delete(value);
    else picked.add(value);
    chip.setAttribute("aria-pressed", picked.has(value) ? "true" : "false");
    apply();
  });

  el.bar.addEventListener("change", (event) => {
    const box = event.target.closest("input[type=checkbox]");
    if (!box) return;
    const drop = box.closest(".fl-dd");
    if (!drop) return;
    const picked = pickedFor(drop.dataset.field);
    if (box.checked) picked.add(box.value);
    else picked.delete(box.value);
    paintDrop(drop);
    apply();
  });

  el.bar.addEventListener("input", (event) => {
    const box = event.target.closest(".fl-dd-search input");
    if (!box) return;
    const needle = box.value.trim().toLowerCase();
    box.closest(".fl-dd-pop")
      .querySelectorAll(".fl-dd-list li")
      .forEach((row) => {
        const name = row.querySelector(".fl-opt-name").textContent.toLowerCase();
        row.hidden = needle !== "" && name.indexOf(needle) === -1;
      });
  });

  el.bar.addEventListener(
    "toggle",
    (event) => {
      const drop = event.target.closest(".fl-dd");
      if (drop && drop.open) placeDrop(drop);
    },
    true
  );

  document.addEventListener("click", (event) => {
    drops.forEach((drop) => {
      if (drop.open && !drop.contains(event.target)) drop.open = false;
    });
  });

  el.lanes.addEventListener("click", (event) => {
    const section = event.target.closest(".col");
    if (!section || event.target.closest(".tkt")) return;
    const lane = laneByName.get(section.dataset.lane);
    if (!lane || !lane.collapsed) return;
    if (!state.open.has(lane.name)) {
      setLaneOpen(lane, true);
      writeHash();
      return;
    }
    if (event.target.closest(".col-toggle")) {
      setLaneOpen(lane, false);
      writeHash();
    }
  });

  el.lanes.addEventListener("click", (event) => {
    const button = event.target.closest(".tkt-open");
    if (!button) return;
    const ticket = byPath.get(button.closest(".tkt").dataset.path);
    if (ticket) openTicket(ticket, button);
  });

  el.detail.addEventListener("click", (event) => {
    const ref = event.target.closest("[data-ref]");
    if (!ref) return;
    const ticket = byId.get(ref.dataset.ref);
    if (ticket) showTicket(ticket);
  });

  el.detailCopy.addEventListener("click", copyPath);

  el.detailClose.addEventListener("click", () => el.detail.close());
  el.detail.addEventListener("close", () => {
    markCopy("rest");
    openPath = null;
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });

  el.clear.addEventListener("click", () => {
    state.q = "";
    state.needle = "";
    state.facets.forEach((picked) => picked.clear());
    el.search.value = "";
    el.bar.querySelectorAll(".fl-dd-search input").forEach((box) => (box.value = ""));
    el.bar.querySelectorAll(".fl-dd-list li").forEach((row) => (row.hidden = false));
    paintControls();
    apply();
    el.search.focus();
  });

  document.addEventListener("keydown", (event) => {
    const tag = (event.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable;

    if (event.key === "/" && !typing && !el.detail.open && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      el.search.focus();
      el.search.select();
      return;
    }
    if (
      (event.key === "c" || event.key === "C") &&
      el.detail.open &&
      !el.detailCopy.hidden &&
      !typing &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      copyPath();
      return;
    }
    if (event.key !== "Escape") return;
    if (el.detail.open) return;
    const openDrop = drops.filter((drop) => drop.open)[0];
    if (openDrop) {
      openDrop.open = false;
      return;
    }
    if (el.search.value) {
      el.search.value = "";
      state.q = "";
      state.needle = "";
      apply();
    }
    if (event.target === el.search) el.search.blur();
  });

  window.addEventListener("hashchange", () => {
    readHash();
    paintControls();
    sortRecords();
    apply();
  });

  // ------------------------------------------------------------- load

  /** A board filtered to nothing and a board that holds nothing are two states. */
  function emptyState(count) {
    const title = el.boardEmpty.querySelector(".board-empty-title");
    const line = el.boardEmpty.querySelector(".board-empty-line");
    if (!title || !line) return;
    if (count) {
      title.textContent = "No ticket matches";
      line.textContent = "Loosen a filter, or clear them all.";
      return;
    }
    const first = warnings.filter((note) => note && note.reason)[0];
    title.textContent = "No tickets on this board";
    line.textContent = first
      ? (first.path ? first.path + ": " : "") + first.reason
      : "Nothing under this repo matched the ticket glob.";
  }

  function fail(reason) {
    const title = el.boardEmpty.querySelector(".board-empty-title");
    const line = el.boardEmpty.querySelector(".board-empty-line");
    const glyph = el.boardEmpty.querySelector(".board-empty-glyph");
    if (glyph) glyph.textContent = "[ ! ]";
    if (title) title.textContent = "The board did not load";
    if (line) line.textContent = reason + ".";
    el.clear.hidden = true;
    el.boardEmpty.hidden = false;
    el.lanes.innerHTML = "";
  }

  function addNotesButton() {
    if (notesButton) {
      notesButton.remove();
      notesButton = null;
    }
    if (!warnings.length || !el.header) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag";
    button.id = "scan-notes";
    button.style.cursor = "pointer";
    button.title = "Read the scan notes";
    button.textContent = warnings.length + (warnings.length === 1 ? " note" : " notes");
    button.addEventListener("click", () => {
      opener = button;
      showNotes();
    });
    el.header.insertBefore(button, document.getElementById("theme-toggle"));
    notesButton = button;
  }

  function readFacets(data) {
    const tallies = data.facets && typeof data.facets === "object" ? data.facets : {};
    const config = Array.isArray(data.facetConfig) ? data.facetConfig : [];
    const order = config.map((entry) => entry && entry.field).filter((field) => field in tallies);
    Object.keys(tallies).forEach((field) => {
      if (order.indexOf(field) === -1) order.push(field);
    });
    const colors = new Map();
    config.forEach((entry) => {
      if (entry && entry.field && entry.colors) colors.set(entry.field, entry.colors);
    });

    facets = order.map((field) => ({
      field,
      values: Array.isArray(tallies[field]) ? tallies[field] : [],
      colors: colors.get(field) || null
    }));
    facetByField = new Map(facets.map((facet) => [facet.field, facet]));
    badgeFacet = facets.filter((facet) => facet.colors)[0] || null;
  }

  function load(data) {
    warnings = Array.isArray(data.warnings) ? data.warnings : [];
    const title = typeof data.title === "string" && data.title ? data.title : "scratchboard";
    el.boardTitle.textContent = title;
    document.title = title;

    readFacets(data);

    byPath = new Map();
    byId = new Map();
    const records = (data.tickets || []).map((ticket) => {
      ticket.fields = ticket.fields && typeof ticket.fields === "object" ? ticket.fields : {};
      ticket.refs = Array.isArray(ticket.refs) ? ticket.refs : [];
      byPath.set(ticket.path, ticket);
      if (ticket.id) byId.set(ticket.id, ticket);
      const values = Object.keys(ticket.fields)
        .map((field) => fieldValues(ticket, field).join(" "))
        .join("\n");
      return {
        ticket,
        node: null,
        lowTitle: String(ticket.title).toLowerCase(),
        hay: [ticket.id || "", ticket.id ? "#" + ticket.id : "", ticket.title, ticket.slug, ticket.path, values, ticket.body]
          .join("\n")
          .toLowerCase()
      };
    });
    hasIds = byId.size > 0;
    if (el.sortById) {
      if (hasIds && !el.sortById.parentNode) el.sort.insertBefore(el.sortById, el.sort.options[1] || null);
      else if (!hasIds && el.sortById.parentNode) el.sortById.remove();
    }

    const counts = (data.counts && data.counts.byLane) || {};
    lanes = (data.lanes || []).map((lane) => ({
      name: lane.name,
      collapsed: lane.collapsed === true,
      records: [],
      built: false
    }));
    laneByName = new Map(lanes.map((lane) => [lane.name, lane]));
    buildBoard();

    lanes.forEach((lane) => {
      lane.records = records.filter((record) => record.ticket.lane === lane.name);
      lane.total = typeof counts[lane.name] === "number" ? counts[lane.name] : lane.records.length;
    });
    el.headCounts.innerHTML = lanes
      .map(
        (lane, index) =>
          (index ? '<span class="hd-pipe" aria-hidden="true">|</span>' : "") +
          `<span class="hd-count"><span class="hd-count-n">${lane.total}</span> ${esc(lane.name)}</span>`
      )
      .join("");

    readHash();
    buildFacetControls();
    paintControls();

    sortRecords();
    lanes.forEach((lane) => {
      if (!lane.collapsed) buildLane(lane);
    });
    apply();
    emptyState(records.length);
    addNotesButton();

    if (!painted) {
      painted = true;
      el.board.dataset.readyMs = String(Math.round(performance.now()));
    }
  }

  function capture() {
    const scrolls = new Map();
    lanes.forEach((lane) => {
      if (lane.list) scrolls.set(lane.name, lane.list.scrollTop);
    });
    return {
      scrolls,
      window: { x: window.scrollX, y: window.scrollY },
      search: {
        focused: document.activeElement === el.search,
        start: el.search.selectionStart,
        end: el.search.selectionEnd
      },
      ticket: openPath,
      label: openLabel
    };
  }

  function restore(memory) {
    lanes.forEach((lane) => {
      const top = memory.scrolls.get(lane.name);
      if (lane.list && typeof top === "number") lane.list.scrollTop = top;
    });
    window.scrollTo(memory.window.x, memory.window.y);
    if (memory.search.focused) {
      el.search.focus();
      try {
        el.search.setSelectionRange(memory.search.start, memory.search.end);
      } catch (error) {
        /* a search input rejects a range in some engines */
      }
    }
    if (!memory.ticket) return;
    const ticket = byPath.get(memory.ticket);
    if (ticket) {
      showTicket(ticket);
      return;
    }
    if (el.detail.open) el.detail.close();
    showNotice(memory.label + " is gone from the board");
  }

  function render(data) {
    const memory = capture();
    load(data);
    restore(memory);
  }

  window.scratchboard = { render };

  const node = document.getElementById("payload");
  let payload;
  try {
    payload = JSON.parse((node && node.textContent) || "null");
  } catch (error) {
    payload = undefined;
  }
  if (payload === undefined) fail("the payload is not valid JSON");
  else if (!payload || typeof payload !== "object") fail("the page carries no payload");
  else if (payload.error) fail(String(payload.error));
  else load(payload);
})();
