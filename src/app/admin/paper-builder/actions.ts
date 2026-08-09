"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import {
  calculatePatternMarks,
  findDuplicateSelection,
  isCompleteMcq,
  questionMatchesPattern,
} from "@/lib/paper-builder/rules";
import {
  PAPER_DIFFICULTIES,
  PAPER_TEST_TYPES,
  type PaperBuilderQuestion,
  type PaperValidationInput,
  type ValidatedPaper,
} from "@/lib/paper-builder/types";

const allowedTestTypes = new Set<string>(PAPER_TEST_TYPES);
const allowedDifficulties = new Set<string>(PAPER_DIFFICULTIES);

export async function validatePaperBuilderSelection(
  input: PaperValidationInput,
): Promise<{ success: true; paper: ValidatedPaper } | { success: false; error: string }> {
  try {
    await requireSuperAdmin();

    const title = typeof input?.details?.title === "string" ? input.details.title.trim() : "";
    const instructions =
      typeof input?.details?.instructions === "string" ? input.details.instructions.trim() : "";
    const durationMinutes = input?.details?.durationMinutes;
    const targetMarks = input?.details?.targetMarks;

    if (!title || title.length > 200) {
      return { success: false, error: "Add a paper title of 200 characters or fewer." };
    }
    if (!allowedTestTypes.has(input?.details?.testType)) {
      return { success: false, error: "Choose a valid test type." };
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
      return { success: false, error: "Duration must be between 1 and 300 minutes." };
    }
    if (!Number.isInteger(targetMarks) || targetMarks < 1 || targetMarks > 1000) {
      return { success: false, error: "Target marks must be a positive whole number." };
    }
    if (instructions.length > 3000) {
      return { success: false, error: "Instructions must be 3,000 characters or fewer." };
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
      return { success: false, error: "Add between 1 and 20 pattern rows." };
    }
    const patternIds = new Set<string>();
    for (const pattern of patterns) {
      if (typeof pattern.id !== "string" || !pattern.id || patternIds.has(pattern.id)) {
        return { success: false, error: "Each pattern row must have a unique identifier." };
      }
      patternIds.add(pattern.id);
      if (
        !Number.isInteger(pattern.questionCount) ||
        pattern.questionCount < 1 ||
        pattern.questionCount > 100
      ) {
        return { success: false, error: "Each pattern row needs 1 to 100 questions." };
      }
      if (
        !Number.isInteger(pattern.marksPerQuestion) ||
        pattern.marksPerQuestion < 1 ||
        pattern.marksPerQuestion > 100
      ) {
        return { success: false, error: "Marks per question must be a positive whole number." };
      }
      if (!allowedDifficulties.has(pattern.difficulty)) {
        return { success: false, error: "Choose a valid difficulty for every pattern row." };
      }
    }

    const sections = Array.isArray(input.sections) ? input.sections : [];
    if (sections.length !== patterns.length) {
      return { success: false, error: "Every pattern row must have one selected question section." };
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

    const selectedIds = patterns.flatMap(
      (pattern) => sectionByPattern.get(pattern.id) ?? [],
    );
    if (selectedIds.length === 0 || selectedIds.length > 200) {
      return { success: false, error: "Select between 1 and 200 questions." };
    }
    if (new Set(selectedIds).size !== selectedIds.length) {
      return { success: false, error: "Duplicate Question Bank IDs are not allowed." };
    }

    const calculatedPatternMarks = calculatePatternMarks(patterns);
    if (calculatedPatternMarks !== targetMarks) {
      return {
        success: false,
        error: `Pattern rows total ${calculatedPatternMarks} marks, but target marks are ${targetMarks}.`,
      };
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
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        explanation: true,
        topicTag: true,
        difficulty: true,
        marks: true,
        topic: { select: { topicName: true } },
      },
    });
    if (records.length !== selectedIds.length) {
      return {
        success: false,
        error:
          "One or more questions are missing, workspace-owned, or outside the selected subject and topics.",
      };
    }

    const questions: PaperBuilderQuestion[] = records.map((question) => ({
      id: question.id,
      subjectId: question.subjectId,
      topicId: question.topicId,
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer.trim().toUpperCase(),
      explanation: question.explanation,
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
          error: `A pattern row requires ${pattern.questionCount} questions but has ${ids.length}.`,
        };
      }
      const sectionQuestions = ids.map((id) => questionById.get(id)!);
      const invalidQuestion = sectionQuestions.find(
        (question) =>
          !isCompleteMcq(question) ||
          !questionMatchesPattern(question, input.subjectId, topicIds, pattern),
      );
      if (invalidQuestion) {
        return {
          success: false,
          error:
            "A selected question no longer matches its pattern difficulty, marks, subject, topics, or MCQ requirements.",
        };
      }
      validatedSections.push({
        patternId: pattern.id,
        questionCount: pattern.questionCount,
        marksPerQuestion: pattern.marksPerQuestion,
        difficulty: pattern.difficulty,
        questions: sectionQuestions,
      });
    }

    const calculatedQuestionMarks = orderedQuestions.reduce(
      (total, question) => total + question.marks,
      0,
    );
    if (calculatedQuestionMarks !== targetMarks) {
      return {
        success: false,
        error: `Selected questions total ${calculatedQuestionMarks} marks, but target marks are ${targetMarks}.`,
      };
    }

    return {
      success: true,
      paper: {
        details: {
          title,
          testType: input.details.testType,
          durationMinutes,
          targetMarks,
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
