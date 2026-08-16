import type {
  PaperBuilderQuestion,
  ValidatedPaper,
  ValidatedPaperSection,
} from "./types";

export const FINAL_PAPER_ORDER_MODES = [
  "chapter_wise",
  "shuffle_within_sections",
  "fully_shuffled",
] as const;

export type FinalPaperOrderMode = (typeof FINAL_PAPER_ORDER_MODES)[number];

export const FINAL_PAPER_ORDER_LABELS: Record<FinalPaperOrderMode, string> = {
  chapter_wise: "Chapter-wise",
  shuffle_within_sections: "Shuffle within sections",
  fully_shuffled: "Fully shuffled",
};

function seededValue(value: string, revision: number) {
  let hash = (2166136261 ^ revision) >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: T[], revision: number, identity: (item: T) => string) {
  return [...items].sort((left, right) => {
    const difference = seededValue(identity(left), revision) - seededValue(identity(right), revision);
    return difference || identity(left).localeCompare(identity(right));
  });
}

function sectionShuffle(questions: PaperBuilderQuestion[], revision: number) {
  const topics = new Map<string, PaperBuilderQuestion[]>();
  for (const question of questions) {
    const key = question.topicId ?? "unassigned";
    topics.set(key, [...(topics.get(key) ?? []), question]);
  }

  const buckets = seededShuffle(
    [...topics.entries()].map(([topicId, items]) => ({
      topicId,
      items: seededShuffle(items, revision + 17, (item) => item.id),
    })),
    revision,
    (bucket) => bucket.topicId,
  );
  const result: PaperBuilderQuestion[] = [];
  const largestBucket = Math.max(0, ...buckets.map((bucket) => bucket.items.length));
  for (let index = 0; index < largestBucket; index += 1) {
    for (const bucket of buckets) {
      const question = bucket.items[index];
      if (question) result.push(question);
    }
  }
  return result;
}

function canonicalIds(sections: ValidatedPaperSection[]) {
  return sections.flatMap((section) => section.questions.map((question) => question.id));
}

export function createFinalQuestionOrder(
  sections: ValidatedPaperSection[],
  mode: FinalPaperOrderMode,
  revision: number,
) {
  if (mode === "chapter_wise") return canonicalIds(sections);
  if (mode === "shuffle_within_sections") {
    return sections.flatMap((section, index) => (
      sectionShuffle(section.questions, revision + index * 101).map((question) => question.id)
    ));
  }
  return seededShuffle(
    sections.flatMap((section) => section.questions),
    revision,
    (question) => question.id,
  ).map((question) => question.id);
}

export function reconcileFinalQuestionOrder(
  sections: ValidatedPaperSection[],
  mode: FinalPaperOrderMode,
  previousIds: string[],
) {
  if (mode === "chapter_wise") return canonicalIds(sections);
  const validIds = new Set(canonicalIds(sections));
  const retained = previousIds.filter((id, index) => validIds.has(id) && previousIds.indexOf(id) === index);
  const retainedSet = new Set(retained);
  const missing = canonicalIds(sections).filter((id) => !retainedSet.has(id));

  if (mode === "fully_shuffled") return [...retained, ...missing];

  return sections.flatMap((section) => {
    const sectionIds = new Set(section.questions.map((question) => question.id));
    return [
      ...retained.filter((id) => sectionIds.has(id)),
      ...missing.filter((id) => sectionIds.has(id)),
    ];
  });
}

export function replaceFinalQuestionId(ids: string[], oldId: string, newId: string) {
  return ids.map((id) => id === oldId ? newId : id);
}

export function applyFinalQuestionOrder(
  paper: ValidatedPaper,
  mode: FinalPaperOrderMode,
  orderedIds: string[],
): ValidatedPaper {
  if (mode === "chapter_wise") return paper;
  const order = new Map(orderedIds.map((id, index) => [id, index]));
  const position = (question: PaperBuilderQuestion) => order.get(question.id) ?? Number.MAX_SAFE_INTEGER;

  if (mode === "shuffle_within_sections") {
    return {
      ...paper,
      sections: paper.sections.map((section) => ({
        ...section,
        questions: [...section.questions].sort((left, right) => position(left) - position(right)),
      })),
    };
  }

  const questions = paper.sections
    .flatMap((section) => section.questions)
    .sort((left, right) => position(left) - position(right));
  return {
    ...paper,
    sections: questions.length === 0 ? [] : [{
      patternId: "blueprint-fully-shuffled",
      label: "Mixed Questions",
      questionType: questions[0].questionType,
      questionCount: questions.length,
      marksPerQuestion: 0,
      difficulty: "any",
      questions,
      isMixedOutput: true,
    }],
  };
}

export function hasSameQuestionOrder(left: string[], right: string[]) {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

export function reshuffleFinalQuestionOrder(
  sections: ValidatedPaperSection[],
  mode: Exclude<FinalPaperOrderMode, "chapter_wise">,
  previousIds: string[],
  revision: number,
) {
  let nextRevision = revision;
  let next = createFinalQuestionOrder(sections, mode, nextRevision);
  while (next.length > 1 && hasSameQuestionOrder(previousIds, next) && nextRevision < revision + 20) {
    nextRevision += 1;
    next = createFinalQuestionOrder(sections, mode, nextRevision);
  }
  return { ids: next, revision: nextRevision };
}
