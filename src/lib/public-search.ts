export const PUBLIC_SEARCH_GROUP_KEYS = [
  "notes",
  "topicals",
  "worksheets",
  "challenges",
  "topics",
  "subjects",
  "courses",
] as const;

export type PublicSearchGroupKey = (typeof PUBLIC_SEARCH_GROUP_KEYS)[number];

export type PublicSearchResultType =
  | "BOARD"
  | "QUALIFICATION"
  | "SUBJECT"
  | "TOPIC"
  | "NOTE"
  | "WORKSHEET"
  | "TOPICAL_QUESTION"
  | "PRACTICE_CHALLENGE"
  | "COURSE";

export type PublicSearchResult = {
  id: string;
  type: PublicSearchResultType;
  title: string;
  context: string;
  href: string;
};

export type PublicSearchGroups = Record<PublicSearchGroupKey, PublicSearchResult[]>;

export type PublicSearchResponse = {
  query: string;
  groups: PublicSearchGroups;
};

export type SearchTerm = {
  value: string;
  isAlias: boolean;
};

export type PublicSearchCandidate = PublicSearchResult & {
  searchText: Array<string | null | undefined>;
  boardName?: string | null;
  qualityBoost?: number;
};

const SEARCH_ALIASES: Record<string, string[]> = {
  pandas: ["dataframe", "python pandas"],
  dataframe: ["pandas", "python pandas"],
  "group by": ["sql"],
  "aggregate functions": ["sql"],
  query: ["sql"],
  matplotlib: ["graph", "chart", "plotting", "pyplot"],
  "primary key": ["database", "unique identifier"],
  "foreign key": ["database relationship", "reference key"],
  html: ["web authoring", "webpage", "website"],
  css: ["stylesheet", "styling"],
  "data transmission": ["packets", "parity", "checksum", "arq"],
  parity: ["data transmission"],
  checksum: ["data transmission"],
  spreadsheet: ["calc", "libreoffice calc", "excel"],
};

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function expandSearchTerms(query: string): SearchTerm[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const seen = new Set([normalizedQuery]);
  const terms: SearchTerm[] = [{ value: normalizedQuery, isAlias: false }];

  for (const alias of SEARCH_ALIASES[normalizedQuery] ?? []) {
    const normalizedAlias = normalizeSearchText(alias);
    if (!normalizedAlias || seen.has(normalizedAlias)) continue;
    seen.add(normalizedAlias);
    terms.push({ value: normalizedAlias, isAlias: true });
  }

  return terms;
}

export function createEmptyPublicSearchGroups(): PublicSearchGroups {
  return {
    notes: [],
    topicals: [],
    worksheets: [],
    challenges: [],
    topics: [],
    subjects: [],
    courses: [],
  };
}

export function buildSearchContext(...parts: Array<string | null | undefined>) {
  return parts.filter((part): part is string => Boolean(part?.trim())).join(" → ");
}

function scoreText(text: string, term: SearchTerm) {
  if (!text) return 0;

  // Even an exact alias match should remain below a direct substring match.
  const aliasPenalty = term.isAlias ? 200 : 0;
  if (text === term.value) return 400 - aliasPenalty;
  if (text.startsWith(term.value)) return 320 - aliasPenalty;

  const words = text.split(" ");
  if (words.includes(term.value)) return 280 - aliasPenalty;
  if (text.includes(term.value)) return 220 - aliasPenalty;
  return 0;
}

export function scorePublicSearchCandidate(
  candidate: PublicSearchCandidate,
  terms: SearchTerm[],
  preferredBoard: string,
) {
  const normalizedFields = candidate.searchText
    .map((value) => normalizeSearchText(value ?? ""))
    .filter(Boolean);

  let score = 0;
  for (const term of terms) {
    for (const field of normalizedFields) {
      score = Math.max(score, scoreText(field, term));
    }
  }

  score += Math.max(0, candidate.qualityBoost ?? 0);

  if (
    preferredBoard &&
    normalizeSearchText(candidate.boardName ?? "") === normalizeSearchText(preferredBoard)
  ) {
    score += 10;
  }

  return score;
}

export function rankPublicSearchResults(
  candidates: PublicSearchCandidate[],
  terms: SearchTerm[],
  preferredBoard = "",
  limit = 5,
): PublicSearchResult[] {
  return candidates
    .map((candidate) => ({
      candidate,
      score: scorePublicSearchCandidate(candidate, terms, preferredBoard),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const titleOrder = left.candidate.title.localeCompare(right.candidate.title, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (titleOrder !== 0) return titleOrder;
      return left.candidate.href.localeCompare(right.candidate.href);
    })
    .slice(0, limit)
    .map(({ candidate }) => ({
      id: candidate.id,
      type: candidate.type,
      title: candidate.title,
      context: candidate.context,
      href: candidate.href,
    }));
}

export function isResourceIntent(query: string, intent: "worksheet" | "topical" | "challenge") {
  const normalized = normalizeSearchText(query);
  const labels: Record<typeof intent, string[]> = {
    worksheet: ["worksheet", "worksheets", "assignment", "assignments"],
    topical: ["topical", "topical question", "topical questions", "question pack", "question packs"],
    challenge: ["challenge", "challenges", "practice challenge", "practice challenges", "quick practice"],
  };
  return labels[intent].includes(normalized);
}
