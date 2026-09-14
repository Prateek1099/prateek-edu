import {
  freezeMatchForSavedPaper,
  parseFillGradingData,
  parseMatchContent,
  parseMatchGradingData,
  resolveFillForNewSnapshot,
  type MatchSnapshotContent,
} from "@/lib/question-structures";

import type { PaperBuilderQuestion } from "./types";

/** The seed uses visible right-side content only, never the answer mapping. */
function rightSideRandomInt(raw: unknown) {
  const content = parseMatchContent(raw, "bank");
  let state = 2166136261;
  for (const character of JSON.stringify(content.rightItems)) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return (upperExclusive: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % upperExclusive;
  };
}

export function matchDisplayContent(raw: unknown, randomInt?: (upperExclusive: number) => number): MatchSnapshotContent {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "rightDisplayOrder" in raw) {
    return parseMatchContent(raw, "snapshot");
  }
  return freezeMatchForSavedPaper(raw, randomInt ?? rightSideRandomInt(raw));
}

export function fillAcceptedAnswers(question: Pick<PaperBuilderQuestion, "correctAnswer" | "gradingData">) {
  return parseFillGradingData(question.gradingData, question.correctAnswer, true).acceptedAnswers;
}

export function visibleMatchRows(raw: unknown) {
  const content = matchDisplayContent(raw);
  const rightById = new Map(content.rightItems.map((item) => [item.id, item.text]));
  return {
    content,
    left: content.leftItems.map((item, index) => ({ label: String.fromCharCode(65 + index), ...item })),
    right: content.rightDisplayOrder.map((id, index) => ({ label: String(index + 1), id, text: rightById.get(id)! })),
  };
}

export function matchAnswerRows(question: Pick<PaperBuilderQuestion, "structuredContent" | "gradingData" | "marks">) {
  const visible = visibleMatchRows(question.structuredContent);
  const grading = parseMatchGradingData(question.gradingData, visible.content, question.marks);
  const pairByLeft = new Map(grading.correctPairs.map((pair) => [pair.leftId, pair.rightId]));
  const rightById = new Map(visible.right.map((item) => [item.id, item]));
  return visible.left.map((item) => {
    const match = rightById.get(pairByLeft.get(item.id)!)!;
    return { leftLabel: item.label, rightLabel: match.label, rightText: match.text };
  });
}

export function freezeQuestionStructureForSavedPaper(
  question: Pick<PaperBuilderQuestion, "questionType" | "questionText" | "correctAnswer" | "structuredContent" | "gradingData" | "marks">,
  randomInt: (upperExclusive: number) => number,
) {
  if (question.questionType === "FILL_BLANK") {
    return {
      structuredContent: null,
      gradingData: resolveFillForNewSnapshot({ ...question, gradingData: question.gradingData ?? null }),
    };
  }
  if (question.questionType === "MATCH_THE_FOLLOWING") {
    const structuredContent = matchDisplayContent(question.structuredContent, randomInt);
    return {
      structuredContent,
      gradingData: parseMatchGradingData(question.gradingData, structuredContent, question.marks),
    };
  }
  return { structuredContent: null, gradingData: null };
}
