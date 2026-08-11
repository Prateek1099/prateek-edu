import { FileStack } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

import PaperBuilderClient from "./PaperBuilderClient";

export const dynamic = "force-dynamic";

export default async function AdminPaperBuilderPage() {
  await requireSuperAdmin();

  const [subjects, topics, questions] = await Promise.all([
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: [
        { qualification: { board: { title: "asc" } } },
        { qualification: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.topic.findMany({
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    }),
    prisma.bankQuestion.findMany({
      where: { workspaceId: null },
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
        topicTag: true,
        difficulty: true,
        marks: true,
        topic: { select: { topicName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="paper-builder-page space-y-8">
      <header className="paper-builder-screen-only max-w-4xl">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
          <FileStack className="size-4" />
          Temporary print builder
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Paper Builder</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Assemble printable mixed-format class tests from reviewed global Vexa Question Bank records. Papers
          stay in this browser session and are not saved to the database.
        </p>
      </header>

      <PaperBuilderClient
        subjects={subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          boardId: subject.qualification.board.id,
          boardName: subject.qualification.board.name,
          boardTitle: subject.qualification.board.title,
          qualificationId: subject.qualification.id,
          qualificationName: subject.qualification.name,
          qualificationTitle: subject.qualification.title,
        }))}
        topics={topics.map((topic) => ({
          id: topic.id,
          subjectId: topic.subjectId,
          name: topic.topicName,
          sortOrder: topic.sortOrder,
        }))}
        questions={questions.map((question) => ({
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
          topicTag: question.topicTag,
          difficulty: question.difficulty,
          marks: question.marks,
          topicName: question.topic?.topicName ?? null,
        }))}
      />
    </div>
  );
}
