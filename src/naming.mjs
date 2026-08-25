const GENERIC_NAMES = new Set(["issue", "index", "readme", "ticket", "task"]);

/** The deepest segment that names the ticket, skipping container file names like `issue.md`. */
export function ticketName(path) {
  const segments = path.split("/");
  const file = segments[segments.length - 1].replace(/\.[^.]+$/, "");
  if (GENERIC_NAMES.has(file.toLowerCase()) && segments.length > 1) {
    return segments[segments.length - 2];
  }
  return file;
}

export function identify(path, idPattern) {
  const name = ticketName(path);
  if (!idPattern) return { id: null, slug: name };
  let re;
  try {
    re = new RegExp(idPattern);
  } catch {
    return { id: null, slug: name };
  }
  const match = re.exec(name);
  if (!match) return { id: null, slug: name };
  const id = match[1] !== undefined ? String(match[1]) : match[0];
  const slug = name.slice(match.index + match[0].length).replace(/^[-_\s]+/, "");
  return { id, slug: slug || name };
}

/**
 * The one id and title fallback, read by a group's files and by an ordinary ticket alike.
 * A title of `null` is a file that names itself nowhere, which each caller answers its own way.
 */
export function nameFile(path, parsed, idPattern) {
  const held = parsed || {};
  const named = identify(path, idPattern);
  return {
    id: held.id !== null && held.id !== undefined ? String(held.id) : named.id,
    slug: named.slug,
    title: typeof held.title === "string" && held.title.trim() ? held.title : null,
  };
}
