import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import TopicalQuestionViewer from "./TopicalQuestionViewer";

export default async function TopicalQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string; qualification: string; subject: string; id: string }>;
  searchParams: Promise<{ document?: string }>;
}) {
  const { board, qualification, subject, id } = await params;
  const { document } = await searchParams;

  const resource = await prisma.topicalQuestion.findFirst({
    where: {
      id,
      isPublished: true,
      subject: {
        slug: subject,
        status: "PUBLISHED",
        qualification: {
          name: qualification,
          status: "PUBLISHED",
          board: { name: board, status: "PUBLISHED" },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      answersPdfUrl: true,
      subject: { select: { name: true } },
      topic: { select: { topicName: true } },
    },
  });

  if (!resource) notFound();

  return (
    <TopicalQuestionViewer
      resource={{
        id: resource.id,
        title: resource.title,
        description: resource.description,
        subjectName: resource.subject.name,
        topicName: resource.topic?.topicName ?? null,
        hasSolutions: Boolean(resource.answersPdfUrl),
      }}
      initialDocument={document === "solutions" && resource.answersPdfUrl ? "solutions" : "questions"}
      backUrl={`/resources/${board}/${qualification}/${subject}`}
    />
  );
}
