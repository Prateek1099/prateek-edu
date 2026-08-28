import { normalizeQuestionText } from "@/lib/paper-builder/rules";

import type {
  RemedialPracticeCandidate,
  RemedialPracticeWeakTopic,
} from "./types";

export type RemedialSourceQuestion = {
  id: string;
  bankQuestionId: string | null;
  topicId: string | null;
  correctAnswer: string;
};

export type RemedialSourceRecipient = {
  studentId: string;
  assignedAt: Date | string;
};

export type RemedialSourceAttempt = {
  userId: string;
  completedAt: Date | string;
  answers: string;
};

export type RemedialWrongAnswerEvidence = {
  topicMistakes: Map<string, number>;
  topicStudents: Map<string, Set<string>>;
  studentMistakes: Map<string, number>;
};

function parseAnswers(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

export function extractRemedialWrongAnswerEvidence({
  questions,
  recipients,
  attempts,
}: {
  questions: RemedialSourceQuestion[];
  recipients: RemedialSourceRecipient[];
  attempts: RemedialSourceAttempt[];
}): RemedialWrongAnswerEvidence {
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const assignedAtByStudent = new Map(
    recipients.map((recipient) => [recipient.studentId, new Date(recipient.assignedAt).getTime()]),
  );
  const topicMistakes = new Map<string, number>();
  const topicStudents = new Map<string, Set<string>>();
  const studentMistakes = new Map<string, number>();

  for (const attempt of attempts) {
    const assignedAt = assignedAtByStudent.get(attempt.userId);
    if (assignedAt === undefined || new Date(attempt.completedAt).getTime() < assignedAt) continue;

    const answers = parseAnswers(attempt.answers);
    for (const [questionId, answer] of Object.entries(answers)) {
      const question = questionById.get(questionId);
      if (!question?.topicId || !answer.trim()) continue;
      if (answer.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase()) continue;

      topicMistakes.set(question.topicId, (topicMistakes.get(question.topicId) ?? 0) + 1);
      const students = topicStudents.get(question.topicId) ?? new Set<string>();
      students.add(attempt.userId);
      topicStudents.set(question.topicId, students);
      studentMistakes.set(attempt.userId, (studentMistakes.get(attempt.userId) ?? 0) + 1);
    }
  }

  return { topicMistakes, topicStudents, studentMistakes };
}

export function rankRemedialWeakTopics(
  topicNames: Map<string, string>,
  evidence: RemedialWrongAnswerEvidence,
): RemedialPracticeWeakTopic[] {
  return [...evidence.topicMistakes.entries()]
    .flatMap(([id, mistakeCount]) => {
      const name = topicNames.get(id);
      return name
        ? [{ id, name, mistakeCount, affectedStudentCount: evidence.topicStudents.get(id)?.size ?? 0 }]
        : [];
    })
    .sort(
      (left, right) =>
        right.mistakeCount - left.mistakeCount ||
        right.affectedStudentCount - left.affectedStudentCount ||
        left.name.localeCompare(right.name),
    );
}

export function uniqueRemedialCandidates(
  candidates: RemedialPracticeCandidate[],
): RemedialPracticeCandidate[] {
  const ids = new Set<string>();
  const texts = new Set<string>();
  return candidates.filter((candidate) => {
    if (
      !candidate.topicId ||
      ids.has(candidate.id) ||
      !candidate.questionText.trim() ||
      !candidate.optionA.trim() ||
      !candidate.optionB.trim() ||
      !candidate.optionC.trim() ||
      !candidate.optionD.trim() ||
      !Number.isInteger(candidate.marks) ||
      candidate.marks < 1
    ) {
      return false;
    }
    const normalized = normalizeQuestionText(candidate.questionText);
    if (!normalized || texts.has(normalized)) return false;
    ids.add(candidate.id);
    texts.add(normalized);
    return true;
  });
}

export function suggestRemedialQuestionIds({
  candidates,
  weakTopics,
  requestedCount,
}: {
  candidates: RemedialPracticeCandidate[];
  weakTopics: RemedialPracticeWeakTopic[];
  requestedCount: number;
}): string[] {
  if (!Number.isInteger(requestedCount) || requestedCount < 1) return [];
  const topicRank = new Map(weakTopics.map((topic, index) => [topic.id, index]));
  const eligible = uniqueRemedialCandidates(candidates).sort((left, right) => {
    if (left.usedInSourceAssignment !== right.usedInSourceAssignment) {
      return left.usedInSourceAssignment ? 1 : -1;
    }
    return (
      (topicRank.get(left.topicId) ?? Number.MAX_SAFE_INTEGER) -
        (topicRank.get(right.topicId) ?? Number.MAX_SAFE_INTEGER) ||
      left.difficulty.localeCompare(right.difficulty) ||
      left.id.localeCompare(right.id)
    );
  });

  const selected: RemedialPracticeCandidate[] = [];
  const remaining = [...eligible];
  while (remaining.length > 0 && selected.length < requestedCount) {
    for (const topic of weakTopics) {
      const index = remaining.findIndex((candidate) => candidate.topicId === topic.id);
      if (index >= 0) selected.push(remaining.splice(index, 1)[0]);
      if (selected.length >= requestedCount) break;
    }
    if (weakTopics.length === 0) break;
  }
  return selected.map((question) => question.id);
}

export function validateRemedialSelection(
  candidates: RemedialPracticeCandidate[],
  selectedIds: string[],
): string | null {
  if (!Array.isArray(selectedIds) || selectedIds.length < 1 || selectedIds.length > 10) {
    return "Choose between 1 and 10 remedial MCQs.";
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    return "The same Question Bank record cannot be selected more than once.";
  }
  const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const selected = selectedIds.flatMap((id) => {
    const candidate = candidateById.get(id);
    return candidate ? [candidate] : [];
  });
  if (selected.length !== selectedIds.length) {
    return "One or more selected questions are stale or outside the remedial scope.";
  }
  const texts = new Set<string>();
  for (const question of selected) {
    const normalized = normalizeQuestionText(question.questionText);
    if (!normalized || texts.has(normalized)) {
      return "Selected questions must have unique normalized question text.";
    }
    texts.add(normalized);
  }
  return null;
}
