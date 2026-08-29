import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OUT_OF_SCOPE,
  answerOf,
  cardHtmlFor,
  columnHtml,
  columnIcon,
  columnName,
  dirOf,
  foldIcon,
  downstreamOf,
  EDGE_BULGE,
  EDGE_HIDDEN,
  edgeShape,
  headHtml,
  inBoardTarget,
  revealRanks,
  rowsHtml,
} from "../src/ui/board-render.mjs";
import { renderMarkdown } from "../src/ui/markdown.mjs";

/** The board hands the header a renderer and a glyph. These report what they were given. */
const stub = (base, source) => `[md base=${base} source=${source}]`;

const drawn = (name) => (name ? `[icon ${name}]` : "");

const group = (over) => ({ kind: "effort", path: ".scratch/e", title: "Effort", sections: {}, files: [], ...over });

const file = (over) => ({ path: ".scratch/e/1-one.md", title: "One", state: "takeable-now", ...over });

test("a relative link resolves against its base, and an unknown path is not navigation", () => {
  const known = new Map([[".scratch/e/map.md", ".scratch/e/map.md"]]);

  assert.equal(inBoardTarget(known, ".scratch/e", "map.md"), ".scratch/e/map.md");
  assert.equal(inBoardTarget(known, ".scratch/e", "./map.md"), ".scratch/e/map.md");
  assert.equal(inBoardTarget(known, ".scratch/e/deep", "../map.md"), ".scratch/e/map.md");
  assert.equal(inBoardTarget(known, "", ".scratch/e/map.md"), ".scratch/e/map.md");
  assert.equal(inBoardTarget(known, ".scratch/e", "map.md#the-seam"), ".scratch/e/map.md");
  assert.equal(inBoardTarget(known, ".scratch/e", "map.md?x=1"), ".scratch/e/map.md");

  assert.equal(inBoardTarget(known, ".scratch/e", "gone.md"), "", "a path the payload never held");
  assert.equal(inBoardTarget(known, ".scratch/e", "#the-seam"), "", "a bare fragment is not a file");
  assert.equal(inBoardTarget(new Map(), ".scratch/e", "map.md"), "", "a board with no path knows none");
});

test("a path with no slash has no directory", () => {
  assert.equal(dirOf("one.md"), "");
  assert.equal(dirOf(".scratch/e/1-one.md"), ".scratch/e");
});

test("a state key reads as words on the page, and one key carries a label of its own", () => {
  assert.equal(columnName("behind-us"), "Done", "the label is on screen only, the key is unchanged");
  assert.equal(columnName("still-blocked"), "still blocked");
  assert.equal(columnName("takeable-now"), "takeable now");
});

test("a lane and a fold each name the glyph the board draws for them", () => {
  assert.equal(columnIcon("behind-us"), "check", "settled");
  assert.equal(columnIcon("takeable-now"), "issue-opened", "open");
  assert.equal(columnIcon("still-blocked"), "blocked", "obstructed");
  assert.equal(columnIcon("out-of-scope"), "", "a state that never becomes a lane");

  assert.equal(foldIcon("notes"), "note");
  assert.equal(foldIcon("not yet specified"), "question");
  assert.equal(foldIcon("out of scope"), "circle-slash");
  assert.equal(foldIcon("documents"), "file");
  assert.equal(foldIcon("nothing named"), "", "an unnamed fold reached for a glyph");
});

test("the walk follows a blocker forward and never back up its own edges", () => {
  const edges = [
    { from: "1.md", to: "2.md" },
    { from: "2.md", to: "3.md" },
    { from: "4.md", to: "2.md" },
    { from: "8.md", to: "9.md" },
  ];

  assert.deepEqual([...downstreamOf(edges, "1.md")], ["1.md", "2.md", "3.md"]);
  assert.deepEqual([...downstreamOf(edges, "4.md")], ["4.md", "2.md", "3.md"]);
  assert.deepEqual([...downstreamOf(edges, "3.md")], ["3.md"], "nothing upstream comes back");
  assert.equal(downstreamOf(edges, "1.md").has("4.md"), false, "a second blocker is not downstream");
  assert.equal(downstreamOf(edges, "1.md").has("9.md"), false, "an unrelated chain stays out");
});

test("a path with no edge at all answers with itself, and a cycle still ends", () => {
  assert.deepEqual([...downstreamOf([], "1.md")], ["1.md"]);
  assert.deepEqual([...downstreamOf([{ from: "1.md", to: "1.md" }], "1.md")], ["1.md"]);

  const ring = [{ from: "1.md", to: "2.md" }, { from: "2.md", to: "1.md" }];
  assert.deepEqual([...downstreamOf(ring, "1.md")], ["1.md", "2.md"]);
});

test("a card carries its type as a word and reaches for no icon", () => {
  const html = cardHtmlFor(file({ id: "7", type: "decision", title: "Name the seam" }));

  assert.ok(html.includes('<span class="wf-card-type">decision</span>'), "the type is plain text");
  assert.equal(html.includes("<svg"), false, "the card drew an icon");
  assert.equal(/…|&hellip;/.test(html), false, "a real title wraps rather than clipping");
  assert.ok(html.includes('class="wf-card-open" aria-haspopup="dialog"'), "the card opens the dialog");
  assert.ok(html.includes('data-path=".scratch/e/1-one.md"'), "the card keys on its path");
  assert.ok(html.includes('data-state="takeable-now"'));
  assert.ok(html.includes("Name the seam"));
});

test("a claimed card says so, and an unclaimed one carries no claim mark", () => {
  const claimed = cardHtmlFor(file({ claimed: true }));
  const free = cardHtmlFor(file({}));

  assert.ok(claimed.includes('data-claimed="true"'));
  assert.ok(claimed.includes('<span class="wf-card-claim">claimed</span>'));
  assert.equal(free.includes("claimed"), false, "an unclaimed card mentions the word");
});

test("a hostile title, id and path leave a card escaped", () => {
  const html = cardHtmlFor(
    file({ path: 'a".md', id: '"><b>', title: '<script>alert(1)</script>', type: '"x' })
  );

  assert.equal(html.includes("<script"), false, "a title carried a script element through");
  assert.equal(html.includes("<b>"), false, "an id carried an element through");
  assert.ok(html.includes('data-path="a&quot;.md"'), "a quote closed the attribute early");
});

test("the done lane opens, and keeps the control that collapses it", () => {
  const behind = columnHtml(group({ files: [file({ state: "behind-us" })] }), "behind-us", drawn);
  const many = group({ files: Array.from({ length: 9 }, (one, n) => file({ path: `${n}.md` })) });

  assert.equal(behind.includes("is-collapsed"), false, "the done lane opened collapsed");
  assert.ok(behind.includes('<h2 class="wf-col-name">Done</h2>'), "the lane reads by its label");
  assert.ok(behind.includes('<span class="wf-col-count">1</span>'), "an open column still counts");
  assert.ok(behind.includes('class="wf-col-toggle" aria-expanded="true"'), "the reader lost the fold");

  const open = columnHtml(many, "takeable-now", drawn);
  assert.equal(open.includes("is-collapsed"), false, "a long column folded on its size");
  assert.equal(open.includes("wf-col-toggle"), false, "a column that never folds grew a toggle");
  assert.ok(open.includes('<span class="wf-col-count">9</span>'));
});

test("a claimed ticket is not counted by its column", () => {
  const files = [file({ path: "1.md" }), file({ path: "2.md", claimed: true }), file({ path: "3.md" })];
  const html = columnHtml(group({ files }), "takeable-now", drawn);

  assert.ok(html.includes('<span class="wf-col-count">2</span>'), "the claimed ticket counts toward the number");
  assert.ok(html.includes('<span class="wf-col-claimed">+1 claimed</span>'));
  assert.ok(html.includes('data-path="2.md"'), "the claimed card still renders");
});

test("a column holds the files in its own state, names itself in words, and glyphs itself", () => {
  const files = [
    file({ path: "1.md", state: "behind-us" }),
    file({ path: "2.md", state: "still-blocked" }),
    file({ path: "3.md", state: OUT_OF_SCOPE }),
  ];
  const html = columnHtml(group({ files }), "still-blocked", drawn);

  assert.ok(html.includes('data-state="still-blocked"'));
  assert.ok(html.includes('aria-label="still blocked"'), "the column names itself in words");
  assert.ok(html.includes('<h2 class="wf-col-name">still blocked</h2>'));
  assert.ok(
    html.includes('<span class="wf-col-glyph" aria-hidden="true">[icon blocked]</span>'),
    "the column asked the board to draw its own glyph"
  );
  assert.ok(html.includes('data-path="2.md"'));
  assert.equal(html.includes('data-path="1.md"'), false, "a file in another state reached this column");
  assert.equal(html.includes('data-path="3.md"'), false, "an out of scope file reached a column");
});

test("a lead document is openable from its group header", () => {
  const lead = file({ path: ".scratch/e/map.md", role: "lead", title: "The map", state: "" });
  const html = headHtml(group({ files: [lead] }), stub, drawn);

  assert.ok(html.includes('<header class="wf-head" data-path=".scratch/e/map.md">'), "the head carries the lead path");
  assert.ok(html.includes('<button type="button" class="wf-card-open" aria-haspopup="dialog">Effort</button>'));
});

test("a group with no lead keeps a plain title, escaped", () => {
  const html = headHtml(group({ title: '<b>plain</b>' }), stub, drawn);

  assert.equal(html.includes("data-path"), false, "a head with no lead offered a path to open");
  assert.equal(html.includes("wf-card-open"), false, "a head with no lead offered a button");
  assert.ok(html.includes("&lt;b&gt;plain&lt;/b&gt;"));
});

test("an out of scope ticket rides in the header fold, never in a column", () => {
  const spare = file({ path: ".scratch/e/9-spare.md", title: "Spare", state: OUT_OF_SCOPE });
  const html = headHtml(group({ files: [spare], sections: { outOfScope: "- one\n- two\n" } }), stub, drawn);

  assert.ok(html.includes('<span class="wf-fold-name">out of scope</span>'));
  assert.ok(html.includes('<span class="wf-fold-count">3</span>'), "the fold counts the prose and the tickets");
  assert.ok(html.includes('<li class="wf-row" data-path=".scratch/e/9-spare.md"'), "the spare ticket is a row");
  assert.ok(html.includes("[md base=.scratch/e source=- one\n- two\n]"), "the prose went through the renderer");
});

test("a fold reports how many things it holds", () => {
  const items = headHtml(group({ sections: { notes: "- one\n- two\n- three\n" } }), stub, drawn);
  assert.ok(items.includes('<span class="wf-fold-glyph" aria-hidden="true">[icon note]</span>'));
  assert.ok(items.includes('<span class="wf-fold-name">notes</span>'));
  assert.ok(items.includes('<span class="wf-fold-count">3</span>'), "a list counts its markers");

  const prose = headHtml(group({ sections: { fog: "First block.\nStill first.\n\nSecond block.\n" } }), stub, drawn);
  assert.ok(prose.includes('<span class="wf-fold-name">not yet specified</span>'));
  assert.ok(prose.includes('<span class="wf-fold-count">2</span>'), "prose counts its blocks");
});

test("a head with no section and no spare ticket carries no fold at all", () => {
  const html = headHtml(group({ files: [file({ role: "issue" })] }), stub, drawn);

  assert.equal(html.includes("wf-folds"), false);
  assert.equal(html.includes("wf-dest"), false, "a group with no destination opened with one");
});

test("the documents fold holds every other document, and a context opens with its lead", () => {
  const docs = [
    file({ path: ".scratch/e/notes.md", role: "other", title: "Notes", body: "text" }),
    file({ path: ".scratch/e/plan.md", role: "other", title: "Plan", body: "more" }),
  ];
  const effort = headHtml(group({ files: docs }), stub, drawn);

  assert.ok(effort.includes('<span class="wf-fold-name">documents</span>'));
  assert.ok(effort.includes('<span class="wf-fold-count">2</span>'));
  assert.ok(effort.includes('<summary class="wf-doc-btn">Notes</summary>'));
  assert.ok(effort.includes("[md base=.scratch/e source=text]"), "a document body reads its own directory");

  const lead = file({ path: "CONTEXT.md", role: "lead", title: "Glossary", body: "the words" });
  const context = headHtml(group({ kind: "context", path: ".", files: [lead, ...docs] }), stub, drawn);

  assert.equal(context.includes("wf-fold-name\">documents"), false, "a context folds its records twice");
  assert.ok(context.includes("[md base= source=the words]"), "a context opens with the lead body");
});

test("the destination reads against the lead document's own directory", () => {
  const lead = file({ path: ".scratch/e/map.md", role: "lead", state: "" });
  const html = headHtml(group({ files: [lead], sections: { destination: "where we go" } }), stub, drawn);

  assert.ok(html.includes('<div class="wf-dest wf-md">[md base=.scratch/e source=where we go]</div>'));
});

test("a relative link in a header resolves through the payload the board holds", () => {
  const known = new Map([[".scratch/e/1-one.md", ".scratch/e/1-one.md"]]);
  const markdownHtml = (base, source) => renderMarkdown(source, (href) => inBoardTarget(known, base, href));
  const lead = file({ path: ".scratch/e/map.md", role: "lead", state: "" });
  const sections = { destination: "See [one](./1-one.md) and [away](../gone.md)." };
  const html = headHtml(group({ files: [lead], sections }), markdownHtml, drawn);

  assert.ok(html.includes('<button type="button" class="md-link" data-open=".scratch/e/1-one.md">one</button>'));
  assert.equal(html.includes('data-open="../gone.md"'), false, "a link to nothing became a control");
  assert.ok(html.includes("[away](../gone.md)"), "a link to nothing stays plain text");
});

test("no file at all means no list, and a row escapes what it carries", () => {
  assert.equal(rowsHtml([]), "", "an empty list still opened an element");

  const html = rowsHtml([file({ id: "7", type: "decision", title: '<b>Name it</b>' })]);
  assert.ok(html.startsWith('<ol class="wf-list">'));
  assert.ok(html.includes('<span class="wf-row-id">7</span>'));
  assert.ok(html.includes('<span class="wf-row-type">decision</span>'));
  assert.ok(html.includes("&lt;b&gt;Name it&lt;/b&gt;"));
  assert.equal(html.includes("<b>"), false, "a title carried an element through");
});

test("the answer section reads out of a body, and stops at the next heading", () => {
  assert.equal(answerOf("## Answer\nWe ship the reader spec.\n"), "We ship the reader spec.");
  assert.equal(
    answerOf("# One\n\n## Answer\n\nWe ship it.\n\n## Notes\n\nNot this.\n"),
    "We ship it.",
    "the next heading ended the section"
  );
  assert.equal(
    answerOf("## Answer\r\n\r\nWe ship it.\r\n"),
    "We ship it.",
    "a carriage return rode into the text"
  );
  assert.equal(
    answerOf("## Answer\nOne line.\nA second line.\n"),
    "One line. A second line.",
    "the section reads as one run of text"
  );
  assert.equal(answerOf("## answer\nStill it.\n"), "Still it.", "the heading is matched by name, not by case");
});

test("a heading inside a fenced block is text, never a heading", () => {
  assert.equal(
    answerOf("## Notes\n\n```md\n## Answer\nNot an answer.\n```\n"),
    "",
    "a fenced sample grew a bogus answer"
  );
  assert.equal(
    answerOf("## Answer\n\nWe ship it.\n\n```sh\n# run it\nnpx scratchboard\n```\n\nDone.\n"),
    "We ship it. # run it npx scratchboard Done.",
    "a fenced comment cut the answer short"
  );
  assert.equal(
    answerOf("## Answer\n\n~~~\n## Not a heading\n~~~\n\nWe ship it.\n"),
    "## Not a heading We ship it.",
    "a tilde fence is a fence too"
  );
  assert.equal(
    answerOf("## Answer\n\n````\n```\n## Still fenced\n````\n\nWe ship it.\n"),
    "## Still fenced We ship it.",
    "a shorter run does not close a longer fence"
  );
});

test("a body with no answer, and no body at all, answer with nothing", () => {
  assert.equal(answerOf("## Notes\n\nNothing was settled.\n"), "");
  assert.equal(answerOf("## Answer\n\n## Notes\n"), "", "an empty section still reported text");
  assert.equal(answerOf(""), "");
  assert.equal(answerOf(undefined), "");
  assert.equal(answerOf(null), "");
});

test("the answer flattens its markdown and cuts to a card's length", () => {
  assert.equal(
    answerOf("## Answer\n\n- **Ship** the [spec](./one.md), and `hold` the _line_.\n"),
    "Ship the spec, and hold the line.",
    "markdown syntax reached the card"
  );

  const long = answerOf("## Answer\n\n" + "word ".repeat(80));
  assert.ok(long.length < 200, "a whole section rode onto the card");
  assert.ok(long.endsWith("\u2026"), "the cut is not marked");
});

test("a resolved card shows its answer as text, and no other card does", () => {
  const body = "## Answer\n\nWe read it in the renderer.\n";
  const done = cardHtmlFor(file({ state: "behind-us", body }));

  assert.ok(done.includes('<p class="wf-card-answer">We read it in the renderer.</p>'));
  assert.ok(done.indexOf("wf-card-title") < done.indexOf("wf-card-answer"), "the answer reads under the title");

  const open = cardHtmlFor(file({ state: "takeable-now", body }));
  assert.equal(open.includes("wf-card-answer"), false, "an unresolved card showed an answer");

  const none = cardHtmlFor(file({ state: "behind-us" }));
  assert.equal(none.includes("wf-card-answer"), false, "a card with no body grew an empty element");
});

test("a hostile answer lands on the card as escaped text", () => {
  const html = cardHtmlFor(
    file({ state: "behind-us", body: '## Answer\n\n<img src=x onerror="alert(1)"> & done\n' })
  );

  assert.equal(html.includes("<img"), false, "an answer carried an element through");
  assert.ok(html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; done"));
});

/** A box off the layout: the left edge, the top edge, the size, and the column it sits in. */
const box = (over) => ({ x: 0, y: 0, w: 100, h: 20, column: 0, ...over });

const curve = (d) => {
  const found = /^M(-?\d+) (-?\d+) C(-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+)$/.exec(d);
  assert.ok(found, `${d} is one move and one cubic curve`);
  const [x1, y1, c1x, c1y, c2x, c2y, x2, y2] = found.slice(1).map(Number);
  return { x1, y1, c1x, c1y, c2x, c2y, x2, y2 };
};

test("an edge leaves the right of its source and lands on the left of its target", () => {
  const from = box({ x: 10, y: 100, w: 200, h: 40, column: 0 });
  const to = box({ x: 500, y: 300, w: 200, h: 60, column: 1 });
  const shape = curve(edgeShape(from, to));

  assert.equal(shape.x1, 210, "the line starts at the right edge of the source");
  assert.equal(shape.y1, 120, "the line starts halfway down the source");
  assert.equal(shape.x2, 500, "the line ends at the left edge of the target");
  assert.equal(shape.y2, 330, "the line ends halfway down the target");
  assert.equal(shape.c1x, 355, "both handles sit on the midline between the two ends");
  assert.equal(shape.c2x, 355);
  assert.equal(shape.c1y, shape.y1, "the curve leaves flat, so the arrow reads left to right");
  assert.equal(shape.c2y, shape.y2, "and it arrives flat");
});

test("both ends in one column would run backwards, so that edge bulges out on the right", () => {
  const from = box({ x: 10, y: 100, w: 200, h: 40, column: 2 });
  const to = box({ x: 10, y: 300, w: 200, h: 40, column: 2 });
  const shape = curve(edgeShape(from, to));

  assert.equal(shape.x1, 210, "the line leaves the right edge");
  assert.equal(shape.x2, 210, "and comes back to it rather than running right to left");
  assert.equal(shape.c1x, 210 + EDGE_BULGE, "the handles carry the line clear of the column");
  assert.equal(shape.c2x, 210 + EDGE_BULGE);
  assert.ok(shape.y2 > shape.y1, "the two ends are still told apart by height");
});

test("a layout reads back in fractions, and a path holds whole numbers only", () => {
  const from = box({ x: 10.4, y: 100.6, w: 200.2, h: 41.3, column: 0 });
  const to = box({ x: 500.5, y: 300.5, w: 200, h: 61.1, column: 1 });

  assert.match(edgeShape(from, to), /^M[-\d ]+C[-\d ]+$/, "a coordinate carries no decimal point");
  const shape = curve(edgeShape(from, to));
  assert.equal(shape.x1, 211, "10.4 plus 200.2 rounds up");
  assert.equal(shape.y1, 121, "100.6 plus half of 41.3 rounds down from 121.25");
  assert.equal(shape.x2, 501);
  assert.equal(shape.c1x, 356, "the midline rounds after the two ends do");
});

test("a hover reveals the edges into the card and every edge out of it, and nothing else", () => {
  const edges = [
    { from: "1.md", to: "2.md" },
    { from: "2.md", to: "3.md" },
    { from: "4.md", to: "2.md" },
    { from: "8.md", to: "9.md" },
  ];

  assert.deepEqual(revealRanks(edges, "2.md"), [0, 0, 0, EDGE_HIDDEN], "both blockers come with it");
  assert.deepEqual(revealRanks(edges, "1.md"), [0, 1, EDGE_HIDDEN, EDGE_HIDDEN]);
  assert.deepEqual(
    revealRanks(edges, "3.md"),
    [EDGE_HIDDEN, 0, EDGE_HIDDEN, EDGE_HIDDEN],
    "one edge in, and nothing downstream of it"
  );
  assert.deepEqual(revealRanks(edges, "7.md"), edges.map(() => EDGE_HIDDEN), "a path no edge names");
});

test("a rank is how many blockers a line waits behind, and a ring still answers", () => {
  const chain = [
    { from: "3.md", to: "4.md" },
    { from: "1.md", to: "2.md" },
    { from: "2.md", to: "3.md" },
  ];
  assert.deepEqual(revealRanks(chain, "1.md"), [2, 0, 1], "the stagger follows the walk, not the list");

  const ring = [{ from: "1.md", to: "2.md" }, { from: "2.md", to: "1.md" }];
  assert.deepEqual(revealRanks(ring, "1.md"), [0, 0], "a cycle ends, and the edge back in draws first");
  assert.deepEqual(revealRanks([], "1.md"), [], "a group with no edge reveals nothing");
});
