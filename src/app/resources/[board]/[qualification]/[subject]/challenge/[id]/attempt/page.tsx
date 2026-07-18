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

  // Strict Authorization Guard for Workspace Challenges
  if (challenge.workspaceId) {
    const userId = (session.user as any).id as string;
    if (!userId) redirect("/login");
    const isOwner = (session.user as any).workspaceId === challenge.workspaceId;
    
    if (!isOwner) {
      const assignment = await prisma.worksheetAssignment.findUnique({
        where: {
          userId_worksheetId: {
            userId,
            worksheetId: id
          }
        }
      });
      if (!assignment) notFound();
    }
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
