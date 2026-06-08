import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ChallengeEngine from "./ChallengeEngine";

export default async function ChallengeAttemptPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subject: string; id: string }>;
}) {
  const { board, qualification, subject, id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const challenge = await prisma.challenge.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          topicTag: true,
        },
      },
    },
  });

  if (!challenge || !challenge.isPublished || challenge.questions.length === 0) {
    notFound();
  }

  return (
    <ChallengeEngine
      challenge={{
        id: challenge.id,
        title: challenge.title,
        estimatedTime: challenge.estimatedTime,
        questions: challenge.questions,
      }}
      board={board}
      qualification={qualification}
      subject={subject}
    />
  );
}
