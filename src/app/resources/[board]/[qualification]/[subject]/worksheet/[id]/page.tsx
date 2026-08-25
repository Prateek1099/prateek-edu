import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import StudentWorksheetViewer from "@/components/worksheets/StudentWorksheetViewer";
import { canAccessChallengeOrWorksheet } from "@/lib/challenge-access";

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

  if (!worksheet || (worksheet.type !== "WORKSHEET" && worksheet.type !== "PDF_WORKSHEET")) {
    notFound();
  }

  const isPublicGlobalPdf =
    worksheet.type === "PDF_WORKSHEET" && !worksheet.workspaceId && worksheet.isPublished;

  if (!isPublicGlobalPdf) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    const sessionUser = session.user as typeof session.user & { id?: string; role?: string };
    if (!sessionUser.id) redirect("/login");

    const access = await canAccessChallengeOrWorksheet({
      userId: sessionUser.id,
      role: sessionUser.role || "",
      challengeId: worksheet.id,
      action: "view",
    });
    if (!access.allowed) notFound();
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
