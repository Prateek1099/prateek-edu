import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSearchContext,
  createEmptyPublicSearchGroups,
  expandSearchTerms,
  isResourceIntent,
  normalizeSearchText,
  rankPublicSearchResults,
  type PublicSearchCandidate,
} from "./public-search";

function candidate(overrides: Partial<PublicSearchCandidate> = {}): PublicSearchCandidate {
  return {
    id: "topic-pandas-1",
    type: "TOPIC",
    title: "Data Handling Using Pandas - I",
    context: "CBSE Board → Class 12 → Informatics Practices",
    href: "/resources/cbse/class-12/informatics-practices",
    searchText: ["Data Handling Using Pandas - I"],
    boardName: "cbse",
    ...overrides,
  };
}

test("normalizes punctuation and spacing consistently", () => {
  assert.equal(normalizeSearchText("  GROUP_BY  Functions! "), "group by functions");
});

test("expands conservative aliases without replacing the direct query", () => {
  assert.deepEqual(expandSearchTerms("DataFrame"), [
    { value: "dataframe", isAlias: false },
    { value: "pandas", isAlias: true },
    { value: "python pandas", isAlias: true },
  ]);
  assert.deepEqual(expandSearchTerms("series"), [{ value: "series", isAlias: false }]);
});

test("ranks a direct match above an alias match", () => {
  const terms = expandSearchTerms("dataframe");
  const results = rankPublicSearchResults([
    candidate(),
    candidate({
      id: "topic-dataframe",
      title: "DataFrame Essentials",
      href: "/direct",
      searchText: ["DataFrame Essentials"],
    }),
  ], terms);

  assert.equal(results[0].href, "/direct");
  assert.equal(results[0].id, "topic-dataframe");
  assert.equal(results[1].title, "Data Handling Using Pandas - I");
});

test("uses ecosystem preference only as a tie-break boost", () => {
  const terms = expandSearchTerms("computer science");
  const results = rankPublicSearchResults([
    candidate({ title: "Computer Science", href: "/cambridge", searchText: ["Computer Science"], boardName: "cambridge" }),
    candidate({ title: "Computer Science", href: "/cbse", searchText: ["Computer Science"], boardName: "cbse" }),
  ], terms, "cbse");

  assert.equal(results[0].href, "/cbse");
});

test("orders student resources before raw academic navigation groups", () => {
  assert.deepEqual(Object.keys(createEmptyPublicSearchGroups()), [
    "notes",
    "topicals",
    "worksheets",
    "challenges",
    "topics",
    "subjects",
    "courses",
  ]);
});

test("uses public resource richness as a tie-break within a group", () => {
  const terms = expandSearchTerms("sql");
  const results = rankPublicSearchResults([
    candidate({ id: "topic-light", title: "SQL Basics", href: "/light", searchText: ["SQL Basics"] }),
    candidate({ id: "topic-rich", title: "SQL Queries", href: "/rich", searchText: ["SQL Queries"], qualityBoost: 15 }),
  ], terms);

  assert.equal(results[0].id, "topic-rich");
});

test("detects explicit resource-type searches", () => {
  assert.equal(isResourceIntent("Topical Questions", "topical"), true);
  assert.equal(isResourceIntent("worksheet", "worksheet"), true);
  assert.equal(isResourceIntent("practice challenge", "challenge"), true);
  assert.equal(isResourceIntent("questions", "topical"), false);
});

test("builds clean context and complete empty response groups", () => {
  assert.equal(buildSearchContext("CBSE Board", "Class 12", null, "Pandas"), "CBSE Board → Class 12 → Pandas");
  assert.deepEqual(Object.keys(createEmptyPublicSearchGroups()), [
    "notes",
    "topicals",
    "worksheets",
    "challenges",
    "topics",
    "subjects",
    "courses",
  ]);
});
