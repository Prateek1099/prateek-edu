import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import CreateChallengeFromBankClient from "./CreateChallengeFromBankClient";

export const dynamic = "force-dynamic";

export default async function CreateChallengeFromBankPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdminRole((session.user as { role?: string }).role)) {
    redirect("/dashboard");
  }

  const [subjects, topics, questions] = await Promise.all([
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.topic.findMany({
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    }),
    prisma.bankQuestion.findMany({
      where: { workspaceId: null, questionType: "MCQ" },
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
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    label: subject.code ? `${subject.name} (${subject.code})` : subject.name,
    qualificationId: subject.qualification.id,
    qualificationName: subject.qualification.name,
    qualificationTitle: subject.qualification.title,
    boardId: subject.qualification.board.id,
    boardName: subject.qualification.board.name,
    boardTitle: subject.qualification.board.title,
  }));

  const topicOptions = topics.map((topic) => ({
    id: topic.id,
    label: topic.topicName,
    subjectId: topic.subjectId,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="space-y-4">
        <Link
          href="/admin/challenges"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Challenges
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Challenge from Question Bank</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            Filter the reviewed question library, select a stable set of MCQs, and create a normal
            Practice Challenge without pasting questions again.
          </p>
        </div>
      </div>

      <CreateChallengeFromBankClient
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
        bankQuestions={questions.map((question) => ({
          ...question,
          optionA: question.optionA ?? "",
          optionB: question.optionB ?? "",
          optionC: question.optionC ?? "",
          optionD: question.optionD ?? "",
          correctAnswer: question.correctAnswer ?? "",
        }))}
      />
    </div>
  );
}
