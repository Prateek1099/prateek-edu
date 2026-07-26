import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudentWorksheetViewer from "@/components/worksheets/StudentWorksheetViewer";

function getSafeDocumentUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

export default async function StudentWorksheetPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subject: string; id: string }>;
}) {
  const { board, qualification, subject, id } = await params;

  const worksheet = await prisma.challenge.findUnique({
    where: { id },
    include: {
      subject: true,
      topic: true,
      questions: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (
    !worksheet ||
    !worksheet.isPublished ||
    (worksheet.type !== "WORKSHEET" && worksheet.type !== "PDF_WORKSHEET")
  ) {
    notFound();
  }

  if (worksheet.type === "WORKSHEET" || worksheet.workspaceId) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    if (worksheet.workspaceId) {
      const sessionUser = session.user as typeof session.user & {
        id?: string;
        workspaceId?: string | null;
      };
      if (!sessionUser.id) redirect("/login");

      const isOwner = sessionUser.workspaceId === worksheet.workspaceId;
      if (!isOwner) {
        const assignment = await prisma.worksheetAssignment.findUnique({
          where: {
            userId_worksheetId: {
              userId: sessionUser.id,
              worksheetId: worksheet.id,
            },
          },
          select: { id: true },
        });
        if (!assignment) notFound();
      }
    }
  }

  return (
    <StudentWorksheetViewer
      worksheet={{
        type: worksheet.type,
        title: worksheet.title,
        subjectName: worksheet.subject.name,
        topicName: worksheet.topic?.topicName || null,
        estimatedTime: worksheet.estimatedTime,
        createdAt: worksheet.createdAt,
        pdfUrl: getSafeDocumentUrl(worksheet.pdfUrl),
        pdfAnswerUrl: getSafeDocumentUrl(worksheet.pdfAnswerUrl),
        questions: worksheet.questions.map((question) => ({
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
      }}
      backUrl={`/resources/${board}/${qualification}/${subject}`}
    />
  );
}
