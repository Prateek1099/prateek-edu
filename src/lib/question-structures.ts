/** B1-A contracts only. Match is not yet selectable or publishable online. */
export const B1_FILL_NORMALIZATION = Object.freeze({
  unicode: "NFKC",
  trim: true,
  caseInsensitive: true,
  collapseWhitespace: true,
  punctuation: "EXACT",
} as const);

export type FillGradingData = {
  version: 1;
  type: "FILL_BLANK";
  acceptedAnswers: string[];
  normalization: typeof B1_FILL_NORMALIZATION;
};

export type MatchItem = { id: string; text: string };
export type MatchContent = {
  version: 1;
  type: "MATCH_THE_FOLLOWING";
  leftItems: MatchItem[];
  rightItems: MatchItem[];
};
export type MatchSnapshotContent = MatchContent & { rightDisplayOrder: string[] };
export type MatchGradingData = {
  version: 1;
  type: "MATCH_THE_FOLLOWING";
  correctPairs: Array<{ leftId: string; rightId: string }>;
  scoring: "PER_PAIR_INTEGER";
};
export type MatchingResponse = {
  kind: "matching";
  value: Array<{ leftId: string; rightId: string }>;
};

export class QuestionStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuestionStructureError";
  }
}

function demand(condition: unknown, message: string): asserts condition {
  if (!condition) throw new QuestionStructureError(message);
}

function object(value: unknown, message: string): Record<string, unknown> {
  demand(value !== null && typeof value === "object" && !Array.isArray(value), message);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[], message: string) {
  demand(Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)), message);
}

/** Comparison only: preserve the original student answer in assessment evidence. */
export function normalizeFillAnswer(value: string) {
  // Order is intentional and frozen by B1_FILL_NORMALIZATION: NFKC, trim,
  // collapse Unicode whitespace, then locale-independent case normalization.
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
}

export function countLogicalFillBlanks(questionText: string) {
  // Legacy Vexa questions use runs of underscores or ellipses. A contiguous
  // run is one blank; separate runs are separate blanks.
  return [...questionText.matchAll(/_{2,}|\.{3,}/gu)].length;
}

export function assertOneFillBlank(questionText: string) {
  demand(typeof questionText === "string" && countLogicalFillBlanks(questionText) === 1,
    "A Fill Blank question must contain exactly one blank marker.");
}

export function parseFillGradingData(raw: unknown, correctAnswer: string | null, allowLegacy = false): FillGradingData {
  if (raw === null || raw === undefined) {
    demand(allowLegacy, "Fill Blank grading data is required.");
    demand(typeof correctAnswer === "string" && correctAnswer.trim().length > 0 && correctAnswer.length <= 1_000,
      "The legacy Fill Blank canonical answer is invalid.");
    return { version: 1, type: "FILL_BLANK", acceptedAnswers: [correctAnswer], normalization: { ...B1_FILL_NORMALIZATION } };
  }
  const data = object(raw, "Fill Blank grading data must be an object.");
  exactKeys(data, ["version", "type", "acceptedAnswers", "normalization"], "Fill Blank grading data has unexpected fields.");
  demand(data.version === 1 && data.type === "FILL_BLANK", "Unsupported Fill Blank grading version or type.");
  const policy = object(data.normalization, "Fill Blank normalization policy is required.");
  exactKeys(policy, Object.keys(B1_FILL_NORMALIZATION), "Fill Blank normalization policy has unexpected fields.");
  for (const [key, value] of Object.entries(B1_FILL_NORMALIZATION)) {
    demand(policy[key] === value, "Unsupported Fill Blank normalization policy.");
  }
  demand(Array.isArray(data.acceptedAnswers) && data.acceptedAnswers.length >= 1 && data.acceptedAnswers.length <= 20,
    "Fill Blank requires 1–20 accepted answers.");
  const answers: string[] = [];
  const normalized = new Set<string>();
  for (const answer of data.acceptedAnswers) {
    demand(typeof answer === "string" && answer.trim().length > 0 && answer.length <= 1_000,
      "Fill Blank accepted answers must be nonblank and at most 1,000 characters.");
    const comparison = normalizeFillAnswer(answer);
    demand(!normalized.has(comparison), "Fill Blank accepted answers duplicate after normalization.");
    normalized.add(comparison);
    answers.push(answer);
  }
  demand(typeof correctAnswer === "string" && correctAnswer === answers[0],
    "The Fill Blank canonical answer must equal the first accepted answer.");
  return { version: 1, type: "FILL_BLANK", acceptedAnswers: answers, normalization: { ...B1_FILL_NORMALIZATION } };
}

export function resolveFillForNewSnapshot(input: { questionText: string; correctAnswer: string | null; gradingData: unknown }) {
  assertOneFillBlank(input.questionText);
  return parseFillGradingData(input.gradingData, input.correctAnswer, true);
}

/** Assessment copies the saved canonical evidence, resolving only legacy-null grading. */
export function copyFillSavedStructureToAssessment(input: { questionText: string; correctAnswer: string | null; gradingData: unknown }) {
  return { structuredContent: null, gradingData: resolveFillForNewSnapshot(input) };
}

function parseItems(raw: unknown, side: "left" | "right") {
  demand(Array.isArray(raw) && raw.length >= 2 && raw.length <= 12, "Match requires 2–12 items on each side.");
  const ids = new Set<string>();
  const texts = new Set<string>();
  return raw.map((item: unknown): MatchItem => {
    const record = object(item, "Match items must be objects.");
    exactKeys(record, ["id", "text"], "Match items have unexpected fields.");
    const prefix = side === "left" ? "L" : "R";
    demand(typeof record.id === "string" && new RegExp(`^${prefix}[A-Za-z0-9_-]{1,31}$`).test(record.id),
      "Match item IDs must be stable, side-specific, and at most 32 characters.");
    demand(typeof record.text === "string" && record.text.trim().length > 0 && record.text.length <= 1_000,
      "Match item text must be nonblank and at most 1,000 characters.");
    const normalizedText = record.text.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
    demand(!ids.has(record.id) && !texts.has(normalizedText), "Match items must have unique IDs and text within each side.");
    ids.add(record.id);
    texts.add(normalizedText);
    return { id: record.id, text: record.text };
  });
}

export function parseMatchContent(raw: unknown, stage: "bank"): MatchContent;
export function parseMatchContent(raw: unknown, stage: "snapshot"): MatchSnapshotContent;
export function parseMatchContent(raw: unknown, stage: "bank" | "snapshot"): MatchContent | MatchSnapshotContent {
  const content = object(raw, "Match content must be an object.");
  const keys = stage === "snapshot"
    ? ["version", "type", "leftItems", "rightItems", "rightDisplayOrder"]
    : ["version", "type", "leftItems", "rightItems"];
  exactKeys(content, keys, "Match content has missing or unexpected fields.");
  demand(content.version === 1 && content.type === "MATCH_THE_FOLLOWING", "Unsupported Match content version or type.");
  const leftItems = parseItems(content.leftItems, "left");
  const rightItems = parseItems(content.rightItems, "right");
  demand(leftItems.length === rightItems.length, "Match left and right item counts must be equal.");
  const canonical: MatchContent = { version: 1, type: "MATCH_THE_FOLLOWING", leftItems, rightItems };
  if (stage === "bank") return canonical;
  const order = content.rightDisplayOrder;
  const validIds = new Set(rightItems.map((item) => item.id));
  demand(Array.isArray(order) && order.length === rightItems.length &&
    order.every((id) => typeof id === "string" && validIds.has(id)) && new Set(order).size === order.length,
  "Match display order must contain each right item ID exactly once.");
  return { ...canonical, rightDisplayOrder: [...order] as string[] };
}

export function parseMatchGradingData(raw: unknown, content: MatchContent, marks: number): MatchGradingData {
  const data = object(raw, "Match grading data must be an object.");
  exactKeys(data, ["version", "type", "correctPairs", "scoring"], "Match grading data has missing or unexpected fields.");
  demand(data.version === 1 && data.type === "MATCH_THE_FOLLOWING" && data.scoring === "PER_PAIR_INTEGER",
    "Unsupported Match grading version, type, or scoring policy.");
  demand(Array.isArray(data.correctPairs) && data.correctPairs.length === content.leftItems.length,
    "Match grading requires one correct pair for every left item.");
  const leftIds = new Set(content.leftItems.map((item) => item.id));
  const rightIds = new Set(content.rightItems.map((item) => item.id));
  const usedLeft = new Set<string>();
  const usedRight = new Set<string>();
  const correctPairs = data.correctPairs.map((pair: unknown) => {
    const record = object(pair, "Match correct pairs must be objects.");
    exactKeys(record, ["leftId", "rightId"], "Match correct pairs have unexpected fields.");
    demand(typeof record.leftId === "string" && typeof record.rightId === "string" &&
      leftIds.has(record.leftId) && rightIds.has(record.rightId) &&
      !usedLeft.has(record.leftId) && !usedRight.has(record.rightId),
    "Match correct pairs must form a bijection over known item IDs.");
    usedLeft.add(record.leftId);
    usedRight.add(record.rightId);
    return { leftId: record.leftId, rightId: record.rightId };
  });
  demand(Number.isInteger(marks) && marks >= 1 && marks <= 1_000 && marks % content.leftItems.length === 0,
    "Match marks must be a positive whole-number multiple of the pair count.");
  return { version: 1, type: "MATCH_THE_FOLLOWING", correctPairs, scoring: "PER_PAIR_INTEGER" };
}

/** Server caller supplies randomInt; presentation order never receives grading evidence. */
export function freezeMatchForSavedPaper(contentRaw: unknown, randomInt: (upperExclusive: number) => number): MatchSnapshotContent {
  const content = parseMatchContent(contentRaw, "bank");
  const order = content.rightItems.map((item) => item.id);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const other = randomInt(index + 1);
    demand(Number.isInteger(other) && other >= 0 && other <= index, "Match shuffle source returned an invalid index.");
    [order[index], order[other]] = [order[other], order[index]];
  }
  return { ...content, rightDisplayOrder: order };
}

/** Assessment publication copies saved presentation; it never reshuffles it. */
export function copyMatchSavedStructureToAssessment(contentRaw: unknown, gradingRaw: unknown, marks: number) {
  const content = parseMatchContent(contentRaw, "snapshot");
  const gradingData = parseMatchGradingData(gradingRaw, content, marks);
  return { structuredContent: content, gradingData };
}

export function parseMatchingResponse(raw: unknown, contentRaw: unknown): MatchingResponse | null {
  if (raw === null) return null;
  const content = parseMatchContent(contentRaw, "snapshot");
  const response = object(raw, "Match response must be an object.");
  exactKeys(response, ["kind", "value"], "Match response has unexpected fields.");
  demand(response.kind === "matching" && Array.isArray(response.value) && response.value.length <= content.leftItems.length,
    "Match response must contain valid mappings.");
  if (response.value.length === 0) return null;
  const leftIds = new Set(content.leftItems.map((item) => item.id));
  const rightIds = new Set(content.rightItems.map((item) => item.id));
  const seenLeft = new Set<string>();
  const seenRight = new Set<string>();
  const value = response.value.map((pair: unknown) => {
    const record = object(pair, "Match response pairs must be objects.");
    exactKeys(record, ["leftId", "rightId"], "Match response pairs have unexpected fields.");
    demand(typeof record.leftId === "string" && typeof record.rightId === "string" &&
      leftIds.has(record.leftId) && rightIds.has(record.rightId) &&
      !seenLeft.has(record.leftId) && !seenRight.has(record.rightId),
    "Match response contains unknown or duplicate item IDs.");
    seenLeft.add(record.leftId);
    seenRight.add(record.rightId);
    return { leftId: record.leftId, rightId: record.rightId };
  });
  return { kind: "matching", value };
}
