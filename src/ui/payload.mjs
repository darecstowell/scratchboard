const KINDS = new Set(["effort", "feature", "context"]);

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const asArray = (value) => (Array.isArray(value) ? value : []);
const asText = (value, fallback) => (typeof value === "string" && value ? value : fallback);

function normalizeTickets(source) {
  return asArray(source.tickets)
    .filter(isRecord)
    .map((ticket) => ({
      ...ticket,
      fields: isRecord(ticket.fields) ? ticket.fields : {},
      refs: asArray(ticket.refs)
    }));
}

function normalizeLanes(source, tickets) {
  const counts = isRecord(source.counts) && isRecord(source.counts.byLane) ? source.counts.byLane : {};
  return asArray(source.lanes)
    .filter(isRecord)
    .map((lane) => ({
      ...lane,
      collapsed: lane.collapsed === true,
      icon: typeof lane.icon === "string" && lane.icon ? lane.icon : null,
      total:
        typeof counts[lane.name] === "number"
          ? counts[lane.name]
          : tickets.filter((ticket) => ticket.lane === lane.name).length
    }));
}

function normalizeFacets(source) {
  const tallies = isRecord(source.facets) ? source.facets : {};
  const config = asArray(source.facetConfig);
  const order = config.map((entry) => entry && entry.field).filter((field) => field in tallies);
  Object.keys(tallies).forEach((field) => {
    if (order.indexOf(field) === -1) order.push(field);
  });

  const colors = new Map();
  const icons = new Map();
  config.forEach((entry) => {
    if (!entry || !entry.field) return;
    if (entry.colors) colors.set(entry.field, entry.colors);
    if (entry.icon) icons.set(entry.field, entry.icon);
  });

  return order.map((field) => ({
    field,
    values: Array.isArray(tallies[field]) ? tallies[field] : [],
    colors: colors.get(field) || null,
    icon: icons.get(field) || null
  }));
}

function normalizeGroups(source) {
  return asArray(source.groups)
    .filter((group) => isRecord(group) && typeof group.path === "string")
    .map((group) => ({
      ...group,
      kind: KINDS.has(group.kind) ? group.kind : "feature",
      title: asText(group.title, group.path),
      sections: isRecord(group.sections) ? group.sections : {},
      files: asArray(group.files).filter((file) => isRecord(file) && typeof file.path === "string")
    }))
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** A null template opts an entry out by name, so it never reaches a menu. */
function normalizeInvocations(source) {
  return asArray(source.invocations).filter(
    (entry) => entry && typeof entry.name === "string" && typeof entry.template === "string"
  );
}

/**
 * The one place the PAYLOAD contract is read. Given anything `JSON.parse` can return it
 * answers with a fully defaulted payload and never throws. A key it does not know rides
 * through untouched, so a board built by a newer scan still renders here.
 */
export function normalizePayload(data) {
  const source = isRecord(data) ? data : {};
  const tickets = normalizeTickets(source);

  return {
    ...source,
    title: asText(source.title, "scratchboard"),
    warnings: asArray(source.warnings),
    tickets,
    lanes: normalizeLanes(source, tickets),
    facets: normalizeFacets(source),
    groups: normalizeGroups(source),
    invocations: normalizeInvocations(source)
  };
}
