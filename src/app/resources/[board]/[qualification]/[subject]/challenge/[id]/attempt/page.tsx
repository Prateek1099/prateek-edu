import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import ChallengeEngine from "./ChallengeEngine";
import { canAccessChallengeOrWorksheet } from "@/lib/challenge-access";
import { getSafeStudentReturnPath } from "@/lib/student-assignment-navigation";

export default async function ChallengeAttemptPage({
  params,
  searchParams,
}: {
  params: Promise<{ board: string; qualification: string; subject: string; id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { board, qualification, subject, id } = await params;
  const query = await searchParams;
  const publicBackUrl = `/resources/${board}/${qualification}/${subject}`;
  const returnTo = getSafeStudentReturnPath(query.returnTo, publicBackUrl);

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as typeof session.user & { id?: string; role?: string };
  if (!sessionUser.id) redirect("/login");

  const access = await canAccessChallengeOrWorksheet({
    userId: sessionUser.id,
    role: sessionUser.role || "",
    challengeId: id,
    action: "attempt",
  });
  if (!access.allowed) notFound();

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

  if (!challenge) notFound();

  if (challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET") {
    redirect(
      `/resources/${board}/${qualification}/${subject}/worksheet/${id}?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  if (challenge.questions.length === 0 && challenge.type !== "QUICK_PRACTICE") notFound();

  return (
    <ChallengeEngine
      challenge={{
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        estimatedTime: challenge.estimatedTime,
        questions: challenge.questions,
      }}
      board={board}
      qualification={qualification}
      subject={subject}
      returnTo={returnTo}
    />
  );
}
