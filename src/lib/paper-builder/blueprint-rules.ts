import type { PaperBuilderQuestion, ValidatedPaperSection } from "./types";
import type {
  BlueprintChapterDraft,
  BlueprintRowDraft,
} from "./blueprint-types";
import {
  isCompletePaperQuestion,
  normalizeQuestionText,
  shuffled,
} from "./rules";

export function calculateBlueprintRowMarks(row: BlueprintRowDraft) {
  return row.questionCount * row.marksPerQuestion;
}

export function calculateBlueprintChapterMarks(chapter: BlueprintChapterDraft) {
  return chapter.rows.reduce((total, row) => total + calculateBlueprintRowMarks(row), 0);
}

export function calculateBlueprintPaperMarks(chapters: BlueprintChapterDraft[]) {
  return chapters.reduce((total, chapter) => total + calculateBlueprintChapterMarks(chapter), 0);
}

export function questionMatchesBlueprintRow(
  question: PaperBuilderQuestion,
  subjectId: string,
  row: BlueprintRowDraft,
) {
  return (
    question.subjectId === subjectId &&
    question.topicId === row.topicId &&
    question.questionType === row.questionType &&
    question.marks === row.marksPerQuestion &&
    (row.difficulty === "any" || question.difficulty === row.difficulty) &&
    isCompletePaperQuestion(question)
  );
}

export function uniqueBlueprintCandidates(
  questions: PaperBuilderQuestion[],
  subjectId: string,
  row: BlueprintRowDraft,
) {
  const seenText = new Set<string>();
  return questions.filter((question) => {
    if (!questionMatchesBlueprintRow(question, subjectId, row)) return false;
    const normalized = normalizeQuestionText(question.questionText);
    if (!normalized || seenText.has(normalized)) return false;
    seenText.add(normalized);
    return true;
  });
}

export function assembleBlueprintSelections(
  rows: BlueprintRowDraft[],
  pools: Map<string, PaperBuilderQuestion[]>,
  randomize: <T>(items: T[]) => T[] = shuffled,
) {
  const orderedForScarcity = [...rows].sort((left, right) => {
    const leftAvailable = pools.get(left.id)?.length ?? 0;
    const rightAvailable = pools.get(right.id)?.length ?? 0;
    const ratioDifference = leftAvailable / left.questionCount - rightAvailable / right.questionCount;
    return ratioDifference || (leftAvailable - left.questionCount) - (rightAvailable - right.questionCount);
  });

  let lastShortages: Array<{ rowId: string; usableCount: number }> = [];
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const selected = new Map<string, PaperBuilderQuestion[]>();
    const usedIds = new Set<string>();
    const usedText = new Set<string>();
    const shortages: Array<{ rowId: string; usableCount: number }> = [];

    for (const row of orderedForScarcity) {
      const usable = randomize(pools.get(row.id) ?? []).filter((question) => {
        const normalized = normalizeQuestionText(question.questionText);
        return !usedIds.has(question.id) && !usedText.has(normalized);
      });
      if (usable.length < row.questionCount) {
        shortages.push({ rowId: row.id, usableCount: usable.length });
        continue;
      }
      const chosen = usable.slice(0, row.questionCount);
      selected.set(row.id, chosen);
      for (const question of chosen) {
        usedIds.add(question.id);
        usedText.add(normalizeQuestionText(question.questionText));
      }
    }
    if (shortages.length === 0) return { selected, shortages };
    lastShortages = shortages;
  }

  return { selected: new Map<string, PaperBuilderQuestion[]>(), shortages: lastShortages };
}

export function findIncompatibleBlueprintSectionLabels(chapters: BlueprintChapterDraft[]) {
  const definitions = new Map<string, { type: string; marks: number; label: string }>();
  for (const chapter of chapters) {
    for (const row of chapter.rows) {
      const label = row.sectionLabel.trim();
      const normalized = label.toLocaleLowerCase();
      const previous = definitions.get(normalized);
      if (
        previous &&
        (previous.type !== row.questionType || previous.marks !== row.marksPerQuestion)
      ) {
        return `“${label}” must use the same question type and marks in every chapter.`;
      }
      definitions.set(normalized, {
        type: row.questionType,
        marks: row.marksPerQuestion,
        label,
      });
    }
  }
  return null;
}

export function groupBlueprintRowsForOutput(
  generatedRows: Array<BlueprintRowDraft & { questions: PaperBuilderQuestion[] }>,
): ValidatedPaperSection[] {
  const sections = new Map<string, ValidatedPaperSection>();

  for (const row of generatedRows) {
    const key = row.sectionLabel.trim().toLocaleLowerCase();
    const existing = sections.get(key);
    if (existing) {
      existing.questionCount += row.questionCount;
      existing.questions.push(...row.questions);
      if (existing.difficulty !== row.difficulty) existing.difficulty = "any";
      continue;
    }
    sections.set(key, {
      patternId: `blueprint-${row.id}`,
      label: row.sectionLabel.trim(),
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
      questions: [...row.questions],
    });
  }

  return [...sections.values()];
}
