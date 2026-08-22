import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import TopicalQuestionViewer from "./TopicalQuestionViewer";
import { publicMetadata } from "@/lib/seo";

type TopicalRouteParams = { board: string; qualification: string; subject: string; id: string };

export async function generateMetadata({ params }: { params: Promise<TopicalRouteParams> }) {
  const { board, qualification, subject, id } = await params;
  const resource = await prisma.topicalQuestion.findFirst({
    where: {
      id,
      isPublished: true,
      subject: {
        slug: subject,
        status: "PUBLISHED",
        qualification: { name: qualification, status: "PUBLISHED", board: { name: board, status: "PUBLISHED" } },
      },
    },
    select: { title: true, description: true, subject: { select: { name: true } } },
  });
  if (!resource) return { title: "Topical Questions" };
  return publicMetadata({
    title: resource.title,
    description: (resource.description || `Practice ${resource.subject.name} with ${resource.title} topical questions on Vexa.`).slice(0, 160),
    path: `/resources/${board}/${qualification}/${subject}/topical/${id}`,
  });
}

export default async function TopicalQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<TopicalRouteParams>;
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
