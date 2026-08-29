(() => {
  "use strict";

  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const ACCENTS = new Set(["red", "amber", "cyan", "green", "neutral"]);
  const CHIP_MAX = 6;
  const CHIP_BUDGET = 56;
  const DROPDOWN_AT = 12;
  /* Octicons, MIT. The set is deliberately small: every name here is bytes in every baked
     board, and a name this map does not hold warns at config read. */
  const ICONS = {
    "alert": '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>',
    "blocked": '<path d="M4.467.22a.749.749 0 0 1 .53-.22h6.006c.199 0 .389.079.53.22l4.247 4.247c.141.14.22.331.22.53v6.006a.749.749 0 0 1-.22.53l-4.247 4.247a.749.749 0 0 1-.53.22H4.997a.749.749 0 0 1-.53-.22L.22 11.533a.749.749 0 0 1-.22-.53V4.997c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.308v5.384L5.308 14.5h5.384l3.808-3.808V5.308L10.692 1.5ZM4 7.75A.75.75 0 0 1 4.75 7h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 7.75Z"/>',
    "book": '<path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.245a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.507a2.25 2.25 0 0 0-1.591.659l-.622.621a.75.75 0 0 1-1.06 0l-.622-.621A2.25 2.25 0 0 0 5.258 13H.75a.75.75 0 0 1-.75-.75Zm7.251 10.324.004-5.073-.002-2.253A2.25 2.25 0 0 0 5.003 2.5H1.5v9h3.757a3.75 3.75 0 0 1 1.994.574ZM8.755 4.75l-.004 7.322a3.752 3.752 0 0 1 1.992-.572H14.5v-9h-3.495a2.25 2.25 0 0 0-2.25 2.25Z"/>',
    "calendar": '<path d="M4.75 0a.75.75 0 0 1 .75.75V2h5V.75a.75.75 0 0 1 1.5 0V2h1.25c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25V3.75C1 2.784 1.784 2 2.75 2H4V.75A.75.75 0 0 1 4.75 0ZM2.5 7.5v6.75c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V7.5Zm10.75-4H2.75a.25.25 0 0 0-.25.25V6h11V3.75a.25.25 0 0 0-.25-.25Z"/>',
    "check": '<path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>',
    "circle-slash": '<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM3.965 13.096a6.5 6.5 0 0 0 9.131-9.131ZM1.5 8a6.474 6.474 0 0 0 1.404 4.035l9.131-9.131A6.499 6.499 0 0 0 1.5 8Z"/>',
    "columns": '<path d="M2.75 0h2.5C6.216 0 7 .784 7 1.75v12.5A1.75 1.75 0 0 1 5.25 16h-2.5A1.75 1.75 0 0 1 1 14.25V1.75C1 .784 1.784 0 2.75 0Zm8 0h2.5C14.216 0 15 .784 15 1.75v12.5A1.75 1.75 0 0 1 13.25 16h-2.5A1.75 1.75 0 0 1 9 14.25V1.75C9 .784 9.784 0 10.75 0ZM2.5 1.75v12.5c0 .138.112.25.25.25h2.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Zm8 0v12.5c0 .138.112.25.25.25h2.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z"/>',
    "copy": '<path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/>',
    "cross-reference": '<path d="M2.75 3.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 13H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 14.543V13H2.75A1.75 1.75 0 0 1 1 11.25v-7.5C1 2.784 1.784 2 2.75 2h5.5a.75.75 0 0 1 0 1.5ZM16 1.25v4.146a.25.25 0 0 1-.427.177L14.03 4.03l-3.75 3.75a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l3.75-3.75-1.543-1.543A.25.25 0 0 1 11.604 1h4.146a.25.25 0 0 1 .25.25Z"/>',
    "file": '<path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/>',
    "issue-opened": '<path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/>',
    "link": '<path d="m7.775 3.275 1.25-1.25a3.5 3.5 0 1 1 4.95 4.95l-2.5 2.5a3.5 3.5 0 0 1-4.95 0 .751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018 1.998 1.998 0 0 0 2.83 0l2.5-2.5a2.002 2.002 0 0 0-2.83-2.83l-1.25 1.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042Zm-4.69 9.64a1.998 1.998 0 0 0 2.83 0l1.25-1.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-1.25 1.25a3.5 3.5 0 1 1-4.95-4.95l2.5-2.5a3.5 3.5 0 0 1 4.95 0 .751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018 1.998 1.998 0 0 0-2.83 0l-2.5 2.5a1.998 1.998 0 0 0 0 2.83Z"/>',
    "milestone": '<path d="M7.75 0a.75.75 0 0 1 .75.75V3h3.634c.414 0 .814.147 1.13.414l2.07 1.75a1.75 1.75 0 0 1 0 2.672l-2.07 1.75a1.75 1.75 0 0 1-1.13.414H8.5v5.25a.75.75 0 0 1-1.5 0V10H2.75A1.75 1.75 0 0 1 1 8.25v-3.5C1 3.784 1.784 3 2.75 3H7V.75A.75.75 0 0 1 7.75 0Zm4.384 8.5a.25.25 0 0 0 .161-.06l2.07-1.75a.248.248 0 0 0 0-.38l-2.07-1.75a.25.25 0 0 0-.161-.06H2.75a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h9.384Z"/>',
    "note": '<path d="M0 3.75C0 2.784.784 2 1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 14H1.75A1.75 1.75 0 0 1 0 12.25Zm1.75-.25a.25.25 0 0 0-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-8.5a.25.25 0 0 0-.25-.25ZM3.5 6.25a.75.75 0 0 1 .75-.75h7a.75.75 0 0 1 0 1.5h-7a.75.75 0 0 1-.75-.75Zm.75 2.25h4a.75.75 0 0 1 0 1.5h-4a.75.75 0 0 1 0-1.5Z"/>',
    "package": '<path d="m8.878.392 5.25 3.045c.54.314.872.89.872 1.514v6.098a1.75 1.75 0 0 1-.872 1.514l-5.25 3.045a1.75 1.75 0 0 1-1.756 0l-5.25-3.045A1.75 1.75 0 0 1 1 11.049V4.951c0-.624.332-1.201.872-1.514L7.122.392a1.75 1.75 0 0 1 1.756 0ZM7.875 1.69l-4.63 2.685L8 7.133l4.755-2.758-4.63-2.685a.248.248 0 0 0-.25 0ZM2.5 5.677v5.372c0 .09.047.171.125.216l4.625 2.683V8.432Zm6.25 8.271 4.625-2.683a.25.25 0 0 0 .125-.216V5.677L8.75 8.432Z"/>',
    "person": '<path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"/>',
    "question": '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.92 6.085h.001a.749.749 0 1 1-1.342-.67c.169-.339.436-.701.849-.977C6.845 4.16 7.369 4 8 4a2.756 2.756 0 0 1 1.637.525c.503.377.863.965.863 1.725 0 .448-.115.83-.329 1.15-.205.307-.47.513-.692.662-.109.072-.22.138-.313.195l-.006.004a6.24 6.24 0 0 0-.26.16.952.952 0 0 0-.276.245.75.75 0 0 1-1.248-.832c.184-.264.42-.489.692-.661.103-.067.207-.132.313-.195l.007-.004c.1-.061.182-.11.258-.161a.969.969 0 0 0 .277-.245C8.96 6.514 9 6.427 9 6.25a.612.612 0 0 0-.262-.525A1.27 1.27 0 0 0 8 5.5c-.369 0-.595.09-.74.187a1.01 1.01 0 0 0-.34.398ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>',
    "tag": '<path d="M1 7.775V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 0 1 0 2.474l-5.026 5.026a1.75 1.75 0 0 1-2.474 0l-6.25-6.25A1.752 1.752 0 0 1 1 7.775Zm1.5 0c0 .066.026.13.073.177l6.25 6.25a.25.25 0 0 0 .354 0l5.025-5.025a.25.25 0 0 0 0-.354l-6.25-6.25a.25.25 0 0 0-.177-.073H2.75a.25.25 0 0 0-.25.25ZM6 5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/>',
    "workflow": '<path d="M0 1.75C0 .784.784 0 1.75 0h3.5C6.216 0 7 .784 7 1.75v3.5A1.75 1.75 0 0 1 5.25 7H4v4a1 1 0 0 0 1 1h4v-1.25C9 9.784 9.784 9 10.75 9h3.5c.966 0 1.75.784 1.75 1.75v3.5A1.75 1.75 0 0 1 14.25 16h-3.5A1.75 1.75 0 0 1 9 14.25v-.75H5A2.5 2.5 0 0 1 2.5 11V7h-.75A1.75 1.75 0 0 1 0 5.25Zm1.75-.25a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Zm9 9a.25.25 0 0 0-.25.25v3.5c0 .138.112.25.25.25h3.5a.25.25 0 0 0 .25-.25v-3.5a.25.25 0 0 0-.25-.25Z"/>',
  };

  const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

  // ------------------------------------------------------------- links

  /** Keys are escaped paths, because a href is already escaped by the time a link is read. */
  let knownPaths = new Map();

  // ------------------------------------------------------------- elements

  const el = {
    boardTitle: document.querySelector("[data-board-title]"),
    headCounts: document.getElementById("hd-counts"),
    notice: document.getElementById("notice"),
    search: document.getElementById("search-input"),
    sortDrop: document.getElementById("sort-dd"),
    sortVal: document.getElementById("sort-val"),
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
    header: document.querySelector(".hd"),
    frame: document.querySelector(".frame"),
    tabs: document.getElementById("tabs"),
    views: document.getElementById("views")
  };

  const state = {
    q: "",
    needle: "",
    facets: new Map(),
    sort: "updated",
    open: new Set(),
    view: "board"
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
  let groups = [];
  let groupByPath = new Map();
  let fileByPath = new Map();
  let invocations = [];
  let wf = null;

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
      lane.count.textContent = active ? matched + "/" + lane.total : String(lane.total);
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

  /** `resting` is what the button reads with nothing picked. The field name lives on the group
   *  beside it, the same as a chip group, so the button only ever reports its own selection. */
  function makeDropdown(facet, values, withSearch, key, resting, name) {
    const drop = document.createElement("details");
    drop.className = "fl-dd";
    drop.dataset.field = facet.field;
    drop.dataset.resting = resting;
    const searchId = "fl-search-" + key;
    const search = withSearch
      ? `<label class="fl-dd-search" for="${searchId}"><span class="search-glyph" aria-hidden="true">/</span>` +
        `<input id="${searchId}" type="search" placeholder="filter ${values.length} ${esc(facet.field)}"` +
        ` autocomplete="off" spellcheck="false" aria-label="Filter the ${esc(facet.field)} list" /></label>`
      : "";
    drop.innerHTML =
      `<summary class="fl-dd-btn" aria-label="${esc(name)}">` +
      `<span class="fl-dd-val">${esc(resting)}</span>` +
      '<span class="fl-dd-caret" aria-hidden="true">&#9662;</span></summary>' +
      `<div class="fl-dd-pop">${search}<ul class="fl-dd-list">${values.map(optionHtml).join("")}</ul></div>`;
    drops.push(drop);
    return drop;
  }

  /** Sort is built into the page, the facet controls are not, and both close the same ways. */
  function everyDrop() {
    return drops.concat(el.sortDrop);
  }

  function makeGroup(facet) {
    const group = document.createElement("div");
    group.className = "fl-group";
    group.dataset.field = facet.field;
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "Filter by " + facet.field);
    group.innerHTML = `<span class="fl-label">${esc(facet.field)}</span>`;
    return group;
  }

  /** The board is monospace, so a character count is a faithful width. Budgeting by width keeps
   *  a group of long values from wrapping the toolbar the way a fixed item count did. */
  function inlineChips(values) {
    let spent = 0;
    let taken = 0;
    while (taken < values.length && taken < CHIP_MAX) {
      spent += values[taken].value.length;
      if (taken && spent > CHIP_BUDGET) break;
      taken += 1;
    }
    return taken;
  }

  function buildFacetControls() {
    // Only the groups this function built. The sort dropdown is a .fl-dd the page declares,
    // and clearing by that class deleted it on the first render.
    el.bar.querySelectorAll(".fl-group").forEach((node) => node.remove());
    drops = [];

    facets.forEach((facet, index) => {
      if (!facet.values.length) return;
      const group = makeGroup(facet);

      if (facet.values.length >= DROPDOWN_AT) {
        const name = "Filter by " + facet.field;
        group.appendChild(makeDropdown(facet, facet.values, true, index, "all", name));
        el.bar.insertBefore(group, el.sortLabel);
        return;
      }

      const inline = inlineChips(facet.values);
      const chips = facet.values.slice(0, inline);
      const rest = facet.values.slice(inline);
      group.insertAdjacentHTML("beforeend", chips.map((entry) => chipHtml(facet, entry)).join(""));
      if (rest.length) {
        const name = rest.length + " more " + facet.field;
        group.appendChild(makeDropdown(facet, rest, false, index, "+" + rest.length, name));
      }
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
      : drop.dataset.resting;
  }

  function paintControls() {
    el.search.value = state.q;
    el.sortVal.textContent = state.sort;
    el.sortDrop.querySelectorAll("input[type=radio]").forEach((box) => {
      box.checked = box.value === state.sort;
    });
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
        `<span class="col-glyph" aria-hidden="true">${drawGlyph("columns")}</span>` +
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

  // ------------------------------------------------------------- groups

  /* These three are the payload's own state values, not lane names a config owns: the view has
     no facet system and the scan computes the membership. */
  const STATE_KEYS = ["behind-us", "takeable-now", "still-blocked"];
  const EDGE_STAGGER = 40;
  const fileLabel = (file) => (file.id ? "#" + file.id : file.title);

  function setGroups(normalized) {
    groups = normalized;
    groupByPath = new Map(groups.map((group) => [group.path, group]));
    fileByPath = new Map();
    groups.forEach((group) => {
      group.files.forEach((file) => fileByPath.set(file.path, { file, group }));
      group.edges = edgesOf(group);
    });
  }

  function edgesOf(group) {
    if (group.kind !== "effort") return [];
    const inColumn = (file) => Boolean(file) && STATE_KEYS.indexOf(file.state) !== -1;
    const byLocal = new Map();
    group.files.forEach((file) => {
      if (file.id && !byLocal.has(String(file.id))) byLocal.set(String(file.id), file);
    });
    const edges = [];
    group.files.forEach((file) => {
      if (!inColumn(file)) return;
      (Array.isArray(file.blockedBy) ? file.blockedBy : []).forEach((ref) => {
        const blocker = byLocal.get(String(ref));
        if (blocker === file || !inColumn(blocker)) return;
        edges.push({ from: blocker.path, to: file.path, live: blocker.state !== "behind-us" });
      });
    });
    return edges;
  }

  // ------------------------------------------------------------- tabs

  /** A tab wears the shape of what it opens: the lanes, a route, a shelf, or a part. */
  const TAB_ICONS = { board: "columns", effort: "milestone", context: "book", feature: "package" };

  function tabHtml(view, label, icon) {
    return (
      '<button type="button" class="tab" data-view="' + esc(view) + '">' +
      '<span class="tab-glyph" aria-hidden="true">' + drawGlyph(icon) + "</span>" +
      esc(label) + "</button>"
    );
  }

  /** With no group the row leaves the page, so a stock board carries no tab bar at all. */
  function buildTabs() {
    el.tabs.innerHTML = "";
    if (!groups.length) {
      el.tabs.remove();
      return;
    }
    if (!el.tabs.parentNode) el.frame.insertBefore(el.tabs, el.bar);
    el.tabs.innerHTML =
      tabHtml("board", "board", TAB_ICONS.board) +
      groups.map((group) => tabHtml(group.path, group.title, TAB_ICONS[group.kind])).join("");
  }

  function paintTabs() {
    if (!el.tabs.parentNode) return;
    el.tabs.querySelectorAll(".tab").forEach((tab) => {
      if (tab.dataset.view === state.view) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
  }

  function setView(name) {
    state.view = groupByPath.has(name) ? name : "board";
    paintTabs();
    const group = groupByPath.get(state.view) || null;
    el.bar.hidden = Boolean(group);
    el.board.hidden = Boolean(group);
    el.views.hidden = !group;
    wf = null;
    el.views.innerHTML = group ? viewHtml(group) : "";
    el.views.scrollTop = 0;
    if (group) mountView(group);
  }

  // ------------------------------------------------------------- group markup

  const markdownHtml = (base, source) =>
    renderMarkdown(source, (href) => inBoardTarget(knownPaths, base, href));

  const ARROWS = { live: "wf-arrow-live", satisfied: "wf-arrow-satisfied" };
  const STROKES = { live: "var(--accent-amber)", satisfied: "var(--accent-green)" };

  function markerHtml(kind) {
    return (
      '<marker id="' + ARROWS[kind] + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6"' +
      ' markerHeight="6" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="' + STROKES[kind] + '"/></marker>'
    );
  }

  /** The line carries the arrowhead, held back by CSS until it lands, and a second path over
   *  it carries the dash that travels the way the work flows. */
  function edgeHtml(edge) {
    const kind = edge.live ? "live" : "satisfied";
    return (
      '<path class="wf-edge is-' + kind + '" d="" fill="none" stroke="' + STROKES[kind] + '"' +
      ' data-from="' + esc(edge.from) + '" data-to="' + esc(edge.to) + '"' +
      ' stroke-width="' + (edge.live ? "2" : "1.4") + '"' +
      ' style="--wf-marker:url(#' + ARROWS[kind] + ')"/>' +
      '<path class="wf-dash" d="" fill="none"' +
      ' stroke-width="' + (edge.live ? "3" : "2.4") + '"/>'
    );
  }

  function edgesHtml(group) {
    return (
      '<svg class="wf-edges" aria-hidden="true"><defs>' +
      markerHtml("live") + markerHtml("satisfied") + "</defs>" +
      group.edges.map(edgeHtml).join("") +
      "</svg>"
    );
  }

  function effortHtml(group) {
    return (
      '<section class="wf-view" data-group="' + esc(group.path) + '" data-kind="effort">' +
      headHtml(group, markdownHtml, drawGlyph) +
      '<div class="wf-board">' + edgesHtml(group) +
      '<div class="wf-cols">' + STATE_KEYS.map((key) => columnHtml(group, key, drawGlyph)).join("") +
      "</div></div>" +
      '<p class="wf-status" role="status" aria-live="polite"></p>' +
      "</section>"
    );
  }

  function featureHtml(group) {
    const files = group.files.filter((file) => file.role === "issue");
    return (
      '<section class="wf-view" data-group="' + esc(group.path) + '" data-kind="feature">' +
      headHtml(group, markdownHtml, drawGlyph) +
      (files.length ? rowsHtml(files) : '<p class="wf-none">No ticket sits under this folder yet.</p>') +
      "</section>"
    );
  }

  function numberOf(file) {
    if (file.id) return String(file.id);
    const found = /\d+/.exec(file.path.slice(file.path.lastIndexOf("/") + 1));
    return found ? found[0] : "";
  }

  function adrHtml(file, key) {
    const status = typeof file.status === "string" ? file.status : "";
    return (
      '<li class="wf-adr" data-path="' + esc(file.path) + '">' +
      (key ? '<span class="wf-adr-n">' + esc(key) + "</span>" : "") +
      '<h3 class="wf-adr-title"><button type="button" class="wf-card-open" aria-haspopup="dialog">' +
      esc(file.title) + "</button></h3>" +
      (status ? '<span class="badge" data-accent="neutral">' + esc(status) + "</span>" : "") +
      "</li>"
    );
  }

  function contextHtml(group) {
    const records = group.files
      .filter((file) => file.role !== "lead")
      .map((file) => ({ file, key: numberOf(file) }));
    return (
      '<section class="wf-view" data-group="' + esc(group.path) + '" data-kind="context">' +
      headHtml(group, markdownHtml, drawGlyph) +
      (records.length
        ? '<ol class="wf-adrs">' + records.map((record) => adrHtml(record.file, record.key)).join("") + "</ol>"
        : "") +
      "</section>"
    );
  }

  function viewHtml(group) {
    if (group.kind === "effort") return effortHtml(group);
    if (group.kind === "context") return contextHtml(group);
    return featureHtml(group);
  }

  // ------------------------------------------------------------- edges

  function mountView(group) {
    const view = el.views.querySelector(".wf-view");
    if (!view || group.kind !== "effort") return;
    wf = {
      view,
      group,
      cards: new Map(),
      paths: [...view.querySelectorAll(".wf-edge")],
      dashes: [...view.querySelectorAll(".wf-dash")],
      pinned: null,
      hovered: null
    };
    view.querySelectorAll(".wf-card").forEach((node) => wf.cards.set(node.dataset.path, node));
    drawEdges();
    restView();
  }

  /** Real cards wrap, so every endpoint is read back from the layout rather than computed. */
  function boxesOf(board) {
    const base = board.getBoundingClientRect();
    const left = base.left - board.scrollLeft;
    const top = base.top - board.scrollTop;
    const found = new Map();
    STATE_KEYS.forEach((key, column) => {
      const section = wf.view.querySelector('.wf-col[data-state="' + key + '"]');
      if (!section) return;
      const files = wf.group.files.filter((file) => file.state === key);
      const folded = section.classList.contains("is-collapsed");
      const rail = section.getBoundingClientRect();
      const slice = rail.height / Math.max(files.length, 1);
      files.forEach((file, row) => {
        const node = folded ? null : wf.cards.get(file.path);
        const box = node ? node.getBoundingClientRect() : null;
        found.set(file.path, {
          x: (box ? box.left : rail.left) - left,
          y: (box ? box.top : rail.top + slice * row) - top,
          w: box ? box.width : rail.width,
          h: box ? box.height : slice,
          column
        });
      });
    });
    return found;
  }

  function drawEdges() {
    if (!wf) return;
    const board = wf.view.querySelector(".wf-board");
    const svg = wf.view.querySelector(".wf-edges");
    if (!board || !svg) return;
    /* The board scrolls inside itself and the edge layer scrolls with it, so the layer covers
       the content rather than the part of it a reader can see. */
    const width = Math.round(board.scrollWidth);
    const height = Math.round(board.scrollHeight);
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    const boxes = boxesOf(board);
    wf.paths.forEach((node, index) => {
      const edge = wf.group.edges[index];
      const from = edge && boxes.get(edge.from);
      const to = edge && boxes.get(edge.to);
      const shape = from && to ? edgeShape(from, to) : "";
      node.setAttribute("d", shape);
      /* The draw runs on the line's own length, and it is only measurable once the line is set. */
      const length = Math.round(shape ? node.getTotalLength() : 0) + "px";
      const dash = wf.dashes[index];
      node.style.setProperty("--wf-len", length);
      if (dash) {
        dash.setAttribute("d", shape);
        dash.style.setProperty("--wf-len", length);
      }
    });
  }

  // ------------------------------------------------------------- hover and pin

  function setStatus(html) {
    const slot = wf && wf.view.querySelector(".wf-status");
    if (slot) slot.innerHTML = html;
  }

  function focusCard(path) {
    const entry = fileByPath.get(path);
    if (!wf || !entry) return;
    const keep = downstreamOf(wf.group.edges, path);
    wf.view.classList.add("is-focused");
    wf.cards.forEach((node, key) => node.classList.toggle("is-dim", !keep.has(key)));
    revealRanks(wf.group.edges, path).forEach((rank, index) => {
      [wf.paths[index], wf.dashes[index]].forEach((node) => {
        if (!node) return;
        node.classList.toggle("is-on", rank !== EDGE_HIDDEN);
        node.style.setProperty("--wf-delay", rank * EDGE_STAGGER + "ms");
      });
    });

    const file = entry.file;
    const unblocks = [...keep]
      .filter((key) => key !== path)
      .map((key) => fileByPath.get(key))
      .filter(Boolean)
      .map((one) => fileLabel(one.file))
      .sort();
    const facts = [file.type, columnName(file.state), file.claimed ? "claimed" : ""].filter(Boolean);
    setStatus(
      "<b>" + esc(fileLabel(file) + " " + file.title) + "</b> " + esc(facts.join(", ")) + ". " +
      (unblocks.length
        ? esc(unblocks.length + " it unblocks: " + unblocks.join(", ") + ".")
        : '<span class="wf-none">Nothing it unblocks.</span>') +
      (wf.pinned ? ' <span class="wf-none">pinned, click it again or press escape</span>' : "")
    );
  }

  function restText() {
    const live = wf.group.edges.filter((edge) => edge.live).length;
    if (!wf.group.edges.length) return '<span class="wf-none">Nothing here blocks anything else.</span>';
    return (
      '<span class="wf-none">' +
      esc(
        live + (live === 1 ? " live blocker" : " live blockers") + " of " + wf.group.edges.length +
        ". Hover a ticket to see what it unblocks."
      ) +
      "</span>"
    );
  }

  function restView() {
    if (!wf || wf.pinned) return;
    wf.view.classList.remove("is-focused");
    wf.cards.forEach((node) => node.classList.remove("is-dim"));
    wf.paths.concat(wf.dashes).forEach((node) => node.classList.remove("is-on"));
    setStatus(restText());
  }

  function clearPin() {
    if (!wf || !wf.pinned) return;
    wf.pinned = null;
    wf.hovered = null;
    restView();
  }

  function toggleColumn(button) {
    const section = button.closest(".wf-col");
    if (!section) return;
    const opening = section.classList.contains("is-collapsed");
    section.classList.toggle("is-collapsed", !opening);
    button.setAttribute("aria-expanded", opening ? "true" : "false");
    drawEdges();
  }

  // ------------------------------------------------------------- detail

  /** Config names the icon for a field. These cover the rows the board builds itself, plus the
   *  field names common enough that a stranger's board reads right with no config at all. */
  const DEFAULT_ICONS = {
    lane: "columns",
    path: "file",
    dates: "calendar",
    refs: "cross-reference",
    priority: "alert",
    severity: "alert",
    status: "workflow",
    state: "workflow",
    labels: "tag",
    tags: "tag",
    type: "tag",
    assignee: "person",
    owner: "person",
    milestone: "milestone",
    epic: "milestone",
    source: "book",
    component: "package",
    area: "package",
    link: "link",
    url: "link",
  };

  function glyphSvg(name, size) {
    if (!ICONS[name]) return "";
    return (
      '<svg width="' + size + '" height="' + size + '" viewBox="0 0 16 16" fill="currentColor"' +
      ' aria-hidden="true">' +
      ICONS[name] +
      "</svg>"
    );
  }

  /** The pure renderer holds no path data, so the board hands it the drawing. */
  function drawGlyph(name) {
    return glyphSvg(name, 13);
  }

  function iconFor(term) {
    const facet = facetByField.get(term);
    const named = facet && facet.icon ? facet.icon : DEFAULT_ICONS[term];
    return named ? glyphSvg(named, 12) : "";
  }

  function factRow(term, html, className) {
    const dt = document.createElement("dt");
    dt.innerHTML = iconFor(term);
    dt.appendChild(document.createTextNode(term));
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
    const text = el.detailCopy.querySelector(".detail-copy-text");
    const glyph = el.detailCopy.querySelector(".detail-copy-glyph");
    if (text) text.textContent = COPY_LABELS[result];
    if (glyph) glyph.innerHTML = glyphSvg(result === "done" ? "check" : "copy", 12);
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
    } catch {
      /* an engine is allowed to refuse the command outright */
    }
    pad.remove();
    if (focused && document.contains(focused)) focused.focus();
    return ok;
  }

  function copyText(text) {
    if (!text) return;
    const byCommand = () => markCopy(copyByCommand(text) ? "done" : "failed");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => markCopy("done"), byCommand);
      return;
    }
    byCommand();
  }

  const openPathText = () => {
    const slot = el.detail.querySelector("[data-detail-path]");
    return slot ? slot.textContent : "";
  };

  function copyPath() {
    copyText(openPathText());
  }

  /* The declared list is the whole menu, so a board that declares none grows no caret. */
  const PATH_TOKEN = "{path}";
  let copyMenu = null;

  function buildCopyMenu() {
    if (copyMenu) {
      copyMenu.remove();
      copyMenu = null;
    }
    if (!invocations.length || !el.detailCopy.parentNode) return;
    const menu = document.createElement("div");
    menu.className = "copy-more";
    menu.innerHTML =
      '<button type="button" class="copy-more-btn" aria-expanded="false"' +
      ' aria-label="Copy a prepared invocation" title="Copy a prepared invocation">' +
      '<span class="fl-dd-caret" aria-hidden="true">&#9662;</span></button>' +
      '<div class="copy-more-pop">' +
      invocations
        .map(
          (entry, index) =>
            '<button type="button" class="copy-more-opt" data-invocation="' + index + '">' +
            esc(entry.name) + "</button>"
        )
        .join("") +
      "</div>";
    el.detailCopy.parentNode.insertBefore(menu, el.detailCopy.nextSibling);
    menu.hidden = el.detailCopy.hidden;
    copyMenu = menu;
  }

  function setCopyMenu(open) {
    if (!copyMenu) return;
    copyMenu.classList.toggle("is-open", open);
    copyMenu.querySelector(".copy-more-btn").setAttribute("aria-expanded", open ? "true" : "false");
  }

  /** Split and join, because a replacement string reads $& and a template is a stranger's text. */
  function copyInvocation(index) {
    const entry = invocations[index];
    const path = openPathText();
    setCopyMenu(false);
    if (entry && path) copyText(entry.template.split(PATH_TOKEN).join(path));
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
    if (copyMenu) copyMenu.hidden = false;
    markCopy("rest");
    setSlot("id", ticket.id ? "#" + ticket.id : "");
    setSlot("title", ticket.title);
    fillFacts(ticket);
    el.detailBody.innerHTML = markdownHtml(dirOf(esc(ticket.path)), ticket.body);
    el.detailBody.scrollTop = 0;
    openPath = ticket.path;
    openLabel = ticket.id ? "#" + ticket.id : ticket.title;
    if (!el.detail.open) el.detail.showModal();
  }

  function openTicket(ticket, from) {
    if (from) opener = from;
    showTicket(ticket);
  }

  /** A group file is not a ticket, so it fills the same dialog from its own facts. */
  function showFile(entry) {
    const file = entry.file;
    const badge = el.detail.querySelector("[data-detail-badge]");
    const status = typeof file.status === "string" ? file.status : "";
    if (badge) {
      badge.hidden = !status;
      badge.dataset.accent = "neutral";
      badge.textContent = status;
    }
    el.detailFacts.style.display = "";
    el.detailCopy.hidden = false;
    if (copyMenu) copyMenu.hidden = false;
    markCopy("rest");
    setSlot("id", file.id ? "#" + file.id : "");
    setSlot("title", file.title);

    el.detailFacts.innerHTML = "";
    factRow("group", '<span class="detail-lane">' + esc(entry.group.title) + "</span>");
    if (file.type) factRow("type", esc(file.type));
    if (file.state) factRow("state", esc(columnName(file.state)) + (file.claimed ? ", claimed" : ""));
    factRow("path", "<code data-detail-path>" + esc(file.path) + "</code>");

    el.detailBody.innerHTML = markdownHtml(dirOf(esc(file.path)), file.body);
    el.detailBody.scrollTop = 0;
    openPath = file.path;
    openLabel = fileLabel(file);
    if (!el.detail.open) el.detail.showModal();
  }

  function openByPath(path, from) {
    const ticket = byPath.get(path);
    if (ticket) {
      openTicket(ticket, from);
      return;
    }
    const entry = fileByPath.get(path);
    if (!entry) return;
    if (from) opener = from;
    showFile(entry);
  }

  function showNotes() {
    const badge = el.detail.querySelector("[data-detail-badge]");
    if (badge) badge.hidden = true;
    el.detailFacts.style.display = "none";
    el.detailCopy.hidden = true;
    if (copyMenu) copyMenu.hidden = true;
    markCopy("rest");
    setSlot("id", "");
    setSlot("title", "Scan notes");
    el.detailBody.innerHTML =
      "<p>What the scan wants you to know. Every ticket it could read is on the board.</p><ul>" +
      warnings
        .map((note) => {
          const where = note && note.path ? "<code>" + esc(note.path) + "</code> " : "";
          const why = note && note.reason ? esc(note.reason) : esc(note);
          const fix = note && note.fix ? '<span class="note-fix">' + esc(note.fix) + "</span>" : "";
          return "<li>" + where + why + fix + "</li>";
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
    if (state.view !== "board") parts.push("view=" + encodeURIComponent(state.view));
    const hash = parts.length ? "#" + parts.join("&") : "";
    const next = location.pathname + location.search + hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
  }

  function decode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
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
    state.view = "board";

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
      if (key === "view") {
        const wanted = decode(value);
        if (groupByPath.has(wanted)) state.view = wanted;
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

  el.sortDrop.addEventListener("change", (event) => {
    const pick = event.target.closest("input[type=radio]");
    if (!pick) return;
    state.sort = SORTS[pick.value] ? pick.value : "updated";
    el.sortVal.textContent = state.sort;
    el.sortDrop.open = false;
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
    everyDrop().forEach((drop) => {
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

  el.tabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    setView(tab.dataset.view);
    writeHash();
  });

  el.views.addEventListener("click", (event) => {
    const open = event.target.closest(".wf-card-open");
    if (open) {
      const holder = open.closest("[data-path]");
      if (holder) openByPath(holder.dataset.path, open);
      return;
    }
    const link = event.target.closest("[data-open]");
    if (link) {
      openByPath(link.dataset.open, link);
      return;
    }
    const toggle = event.target.closest(".wf-col-toggle");
    if (toggle) {
      toggleColumn(toggle);
      return;
    }
    if (!wf) return;
    const card = event.target.closest(".wf-card");
    if (!card) {
      clearPin();
      return;
    }
    wf.pinned = wf.pinned === card.dataset.path ? null : card.dataset.path;
    if (wf.pinned) focusCard(wf.pinned);
    else restView();
  });

  el.views.addEventListener("mouseover", (event) => {
    if (!wf || wf.pinned) return;
    const card = event.target.closest(".wf-card");
    if (!card || card === wf.hovered) return;
    wf.hovered = card;
    focusCard(card.dataset.path);
  });

  el.views.addEventListener("mouseout", (event) => {
    if (!wf || wf.pinned) return;
    const card = event.target.closest(".wf-card");
    if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) return;
    wf.hovered = null;
    restView();
  });

  el.detail.addEventListener("click", (event) => {
    const option = event.target.closest("[data-invocation]");
    if (option) {
      copyInvocation(Number(option.dataset.invocation));
      return;
    }
    const caret = event.target.closest(".copy-more-btn");
    if (caret) {
      setCopyMenu(!copyMenu.classList.contains("is-open"));
      return;
    }
    setCopyMenu(false);
    const link = event.target.closest("[data-open]");
    if (link) {
      openByPath(link.dataset.open);
      return;
    }
    const ref = event.target.closest("[data-ref]");
    if (!ref) return;
    const ticket = byId.get(ref.dataset.ref);
    if (ticket) showTicket(ticket);
  });

  el.detailCopy.addEventListener("click", copyPath);

  /** An endpoint is read back off the layout, so a font or a reflow moves every one of them. */
  let redrawTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(redrawTimer);
    redrawTimer = setTimeout(drawEdges, 120);
  });
  window.addEventListener("load", drawEdges);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawEdges, () => {});

  el.detailClose.addEventListener("click", () => el.detail.close());
  el.detail.addEventListener("close", () => {
    markCopy("rest");
    setCopyMenu(false);
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
    if (wf && wf.pinned) {
      clearPin();
      return;
    }
    const openDrop = everyDrop().filter((drop) => drop.open)[0];
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
    setView(state.view);
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
    el.tabs.remove();
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
    button.innerHTML = glyphSvg("alert", 12);
    button.appendChild(
      document.createTextNode(warnings.length + (warnings.length === 1 ? " note" : " notes"))
    );
    button.addEventListener("click", () => {
      opener = button;
      showNotes();
    });
    el.header.insertBefore(button, document.getElementById("theme-toggle"));
    notesButton = button;
  }

  function setFacets(normalized) {
    facets = normalized;
    facetByField = new Map(facets.map((facet) => [facet.field, facet]));
    badgeFacet = facets.filter((facet) => facet.colors)[0] || null;
  }

  function load(data) {
    const payload = normalizePayload(data);
    warnings = payload.warnings;
    el.boardTitle.textContent = payload.title;
    document.title = payload.title;

    setFacets(payload.facets);
    setGroups(payload.groups);
    invocations = payload.invocations;

    byPath = new Map();
    byId = new Map();
    const records = payload.tickets.map((ticket) => {
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
    if (el.sortById) el.sortById.hidden = !hasIds;

    knownPaths = new Map();
    byPath.forEach((ticket, path) => knownPaths.set(esc(path), path));
    fileByPath.forEach((entry, path) => knownPaths.set(esc(path), path));

    lanes = payload.lanes.map((lane) => ({ ...lane, records: [], built: false }));
    laneByName = new Map(lanes.map((lane) => [lane.name, lane]));
    buildBoard();

    lanes.forEach((lane) => {
      lane.records = records.filter((record) => record.ticket.lane === lane.name);
    });
    el.headCounts.innerHTML = lanes
      .map(
        (lane, index) =>
          (index ? '<span class="hd-pipe" aria-hidden="true">|</span>' : "") +
          `<span class="hd-count"><span class="hd-count-n">${lane.total}</span> ${esc(lane.name)}</span>`
      )
      .join("");

    buildTabs();
    readHash();
    buildFacetControls();
    buildCopyMenu();
    paintControls();

    sortRecords();
    lanes.forEach((lane) => {
      if (!lane.collapsed) buildLane(lane);
    });
    apply();
    setView(state.view);
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
        value: el.search.value,
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
    /* a repaint lands on the committed state.q, so keystrokes still inside the debounce
       would be typed away by paintControls */
    if (memory.search.value !== el.search.value) el.search.value = memory.search.value;
    if (memory.search.focused) {
      el.search.focus();
      try {
        el.search.setSelectionRange(memory.search.start, memory.search.end);
      } catch {
        /* a search input rejects a range in some engines */
      }
    }
    if (!memory.ticket) return;
    const ticket = byPath.get(memory.ticket);
    if (ticket) {
      showTicket(ticket);
      return;
    }
    const entry = fileByPath.get(memory.ticket);
    if (entry) {
      showFile(entry);
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
  } catch {
    payload = undefined;
  }
  if (payload === undefined) fail("the payload is not valid JSON");
  else if (!payload || typeof payload !== "object") fail("the page carries no payload");
  else if (payload.error) fail(String(payload.error));
  else load(payload);
})();
