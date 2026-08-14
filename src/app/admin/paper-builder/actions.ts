"use server";

import { BANK_QUESTION_TYPES } from "@/lib/bank-questions";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import {
  calculatePatternMarks,
  findDuplicateSelection,
  isCompletePaperQuestion,
  questionMatchesPattern,
} from "@/lib/paper-builder/rules";
import {
  PAPER_DIFFICULTIES,
  type PaperBuilderQuestion,
  type PaperValidationInput,
  type ValidatedPaper,
} from "@/lib/paper-builder/types";

const allowedDifficulties = new Set<string>(PAPER_DIFFICULTIES);
const allowedQuestionTypes = new Set<string>(BANK_QUESTION_TYPES);

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function validatePaperBuilderSelection(
  input: PaperValidationInput,
): Promise<{ success: true; paper: ValidatedPaper } | { success: false; error: string }> {
  try {
    await requireSuperAdmin();

    const institutionName = cleanText(input?.details?.institutionName, 200);
    const examLabel = cleanText(input?.details?.examLabel, 200);
    const title = cleanText(input?.details?.title, 200);
    const courseLineInput = cleanText(input?.details?.courseLine, 500);
    const topicLineInput = cleanText(input?.details?.topicLine, 1_000);
    const dateText = cleanText(input?.details?.dateText, 200);
    const classText = cleanText(input?.details?.classText, 200);
    const instructions = cleanText(input?.details?.instructions, 3_000);
    const durationMinutes = input?.details?.durationMinutes;

    if (!institutionName) {
      return { success: false, error: "Add an institution name." };
    }
    if (!examLabel) {
      return { success: false, error: "Add an exam label." };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
      return { success: false, error: "Duration must be between 1 and 300 minutes." };
    }
    if (
      typeof input?.details?.showStudentName !== "boolean" ||
      typeof input?.details?.showRollNumber !== "boolean"
    ) {
      return { success: false, error: "Choose valid student detail options." };
    }
    if (typeof input.subjectId !== "string" || !input.subjectId) {
      return { success: false, error: "Choose a subject." };
    }

    const topicIds = Array.isArray(input.topicIds)
      ? input.topicIds.filter((id): id is string => typeof id === "string" && Boolean(id))
      : [];
    if (topicIds.length === 0 || new Set(topicIds).size !== topicIds.length) {
      return { success: false, error: "Choose one or more unique topics." };
    }

    const patterns = Array.isArray(input.patterns) ? input.patterns : [];
    if (patterns.length === 0 || patterns.length > 20) {
      return { success: false, error: "Add between 1 and 20 sections." };
    }

    const patternIds = new Set<string>();
    const sectionLabels = new Set<string>();
    for (const pattern of patterns) {
      if (typeof pattern.id !== "string" || !pattern.id || patternIds.has(pattern.id)) {
        return { success: false, error: "Each section must have a unique identifier." };
      }
      patternIds.add(pattern.id);

      const label = cleanText(pattern.label, 100);
      const normalizedLabel = label.toLowerCase();
      if (!label || sectionLabels.has(normalizedLabel)) {
        return { success: false, error: "Every section needs a unique label." };
      }
      sectionLabels.add(normalizedLabel);

      if (!allowedQuestionTypes.has(pattern.questionType)) {
        return { success: false, error: `Choose a supported question type for ${label}.` };
      }
      if (
        !Number.isInteger(pattern.questionCount) ||
        pattern.questionCount < 1 ||
        pattern.questionCount > 100
      ) {
        return { success: false, error: `${label} needs 1 to 100 questions.` };
      }
      if (
        !Number.isInteger(pattern.marksPerQuestion) ||
        pattern.marksPerQuestion < 1 ||
        pattern.marksPerQuestion > 100
      ) {
        return { success: false, error: `${label} needs positive whole-number marks.` };
      }
      if (!allowedDifficulties.has(pattern.difficulty)) {
        return { success: false, error: `Choose a valid difficulty for ${label}.` };
      }
    }

    const sections = Array.isArray(input.sections) ? input.sections : [];
    if (sections.length !== patterns.length) {
      return { success: false, error: "Every section must have one question selection." };
    }
    const sectionByPattern = new Map<string, string[]>();
    for (const section of sections) {
      if (
        typeof section.patternId !== "string" ||
        !patternIds.has(section.patternId) ||
        sectionByPattern.has(section.patternId) ||
        !Array.isArray(section.questionIds)
      ) {
        return { success: false, error: "Paper sections do not match the configured pattern." };
      }
      sectionByPattern.set(
        section.patternId,
        section.questionIds.filter((id): id is string => typeof id === "string" && Boolean(id)),
      );
    }

    const selectedIds = patterns.flatMap((pattern) => sectionByPattern.get(pattern.id) ?? []);
    if (selectedIds.length === 0 || selectedIds.length > 200) {
      return { success: false, error: "Select between 1 and 200 questions." };
    }
    if (new Set(selectedIds).size !== selectedIds.length) {
      return { success: false, error: "Duplicate Question Bank IDs are not allowed." };
    }

    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: {
        id: true,
        name: true,
        qualification: {
          select: {
            title: true,
            board: { select: { title: true } },
          },
        },
      },
    });
    if (!subject) return { success: false, error: "The selected subject no longer exists." };

    const topics = await prisma.topic.findMany({
      where: { id: { in: topicIds }, subjectId: input.subjectId },
      select: { id: true, topicName: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    });
    if (topics.length !== topicIds.length) {
      return { success: false, error: "One or more selected topics do not belong to the subject." };
    }

    const records = await prisma.bankQuestion.findMany({
      where: {
        id: { in: selectedIds },
        subjectId: input.subjectId,
        topicId: { in: topicIds },
        workspaceId: null,
      },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        questionType: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        modelAnswer: true,
        explanation: true,
        imageUrl: true,
        imageAlt: true,
        imageCaption: true,
        topicTag: true,
        difficulty: true,
        marks: true,
        topic: { select: { topicName: true } },
      },
    });
    if (records.length !== selectedIds.length) {
      return {
        success: false,
        error: "One or more questions are missing, workspace-owned, or outside the selected scope.",
      };
    }

    const questions: PaperBuilderQuestion[] = records.map((question) => ({
      id: question.id,
      subjectId: question.subjectId,
      topicId: question.topicId,
      questionType: question.questionType,
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      modelAnswer: question.modelAnswer,
      explanation: question.explanation,
      imageUrl: question.imageUrl,
      imageAlt: question.imageAlt,
      imageCaption: question.imageCaption,
      topicTag: question.topicTag,
      difficulty: question.difficulty,
      marks: question.marks,
      topicName: question.topic?.topicName ?? null,
    }));
    const questionById = new Map(questions.map((question) => [question.id, question]));
    const orderedQuestions = selectedIds.map((id) => questionById.get(id)!);

    const duplicateError = findDuplicateSelection(orderedQuestions);
    if (duplicateError) return { success: false, error: duplicateError };

    const validatedSections = [];
    for (const pattern of patterns) {
      const ids = sectionByPattern.get(pattern.id) ?? [];
      if (ids.length !== pattern.questionCount) {
        return {
          success: false,
          error: `${cleanText(pattern.label, 100)} requires ${pattern.questionCount} questions but has ${ids.length}.`,
        };
      }
      const sectionQuestions = ids.map((id) => questionById.get(id)!);
      const invalidQuestion = sectionQuestions.find(
        (question) =>
          !isCompletePaperQuestion(question) ||
          !questionMatchesPattern(question, input.subjectId, topicIds, pattern),
      );
      if (invalidQuestion) {
        return {
          success: false,
          error: `${cleanText(pattern.label, 100)} contains a question that no longer matches its type, marks, difficulty, subject, or topics.`,
        };
      }
      validatedSections.push({
        patternId: pattern.id,
        label: cleanText(pattern.label, 100),
        questionType: pattern.questionType,
        questionCount: pattern.questionCount,
        marksPerQuestion: pattern.marksPerQuestion,
        difficulty: pattern.difficulty,
        questions: sectionQuestions,
      });
    }

    const calculatedPatternMarks = calculatePatternMarks(patterns);
    const calculatedQuestionMarks = orderedQuestions.reduce(
      (total, question) => total + question.marks,
      0,
    );
    if (calculatedQuestionMarks !== calculatedPatternMarks) {
      return {
        success: false,
        error: `Selected questions total ${calculatedQuestionMarks} marks, but sections total ${calculatedPatternMarks}.`,
      };
    }

    const defaultCourseLine = `${subject.name} · ${subject.qualification.title} · ${subject.qualification.board.title}`;

    return {
      success: true,
      paper: {
        details: {
          institutionName,
          examLabel,
          title,
          courseLine: courseLineInput || defaultCourseLine,
          topicLine: topicLineInput,
          durationMinutes,
          dateText,
          classText,
          showStudentName: input.details.showStudentName,
          showRollNumber: input.details.showRollNumber,
          instructions,
        },
        boardTitle: subject.qualification.board.title,
        qualificationTitle: subject.qualification.title,
        subjectName: subject.name,
        topicNames: topics.map((topic) => topic.topicName),
        totalMarks: calculatedQuestionMarks,
        sections: validatedSections,
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Paper validation failed.",
    };
  }
}
