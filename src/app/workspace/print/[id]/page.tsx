export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/PrintButton";
import { WorksheetPaper, WorksheetSolutions } from "@/components/worksheets/WorksheetDocument";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";

export default async function WorkspaceContentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireActiveWorkspace();

  const content = await prisma.challenge.findFirst({
    where: {
      id,
      workspaceId: user.workspaceId,
      type: { in: ["WORKSHEET", "QUICK_PRACTICE"] },
    },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      subject: true,
      topic: true,
    },
  });

  if (!content) notFound();

  const document = {
    title: content.title,
    subjectName: content.subject.name,
    topicName: content.topic?.topicName || null,
    createdAt: content.createdAt,
    questions: content.questions.map((question) => ({
      id: question.id,
      questionText: question.questionText,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      topicTag: question.topicTag,
      marks: question.marks,
    })),
  };
  const backUrl = content.type === "QUICK_PRACTICE"
    ? "/workspace/quick-practice"
    : "/workspace/worksheets";

  return (
    <div className="mx-auto min-h-screen max-w-4xl py-2 print:py-0">
      <div className="mb-8 flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href={backUrl} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" /> Back to {content.type === "QUICK_PRACTICE" ? "Quick Practice" : "Worksheets"}
        </Link>
        <PrintButton label="Print questions and solutions" />
      </div>

      <div className="space-y-8">
        <WorksheetPaper worksheet={document} />
        <WorksheetSolutions worksheet={document} />
      </div>
    </div>
  );
}
