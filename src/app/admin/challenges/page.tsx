import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminChallengesClient from "./AdminChallengesClient";
import { isAdminRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AdminChallengesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) {
    redirect("/dashboard");
  }

  const [challenges, subjects, topics] = await Promise.all([
    prisma.challenge.findMany({
      where: {
        type: { in: ["CHALLENGE", "QUICK_PRACTICE"] },
        workspaceId: null,
      },
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
        _count: { select: { questions: true, attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.topic.findMany({
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    label: s.code
      ? `${s.name} (${s.code}) · ${s.qualification.title} · ${s.qualification.board.title}`
      : `${s.name} · ${s.qualification.title} · ${s.qualification.board.title}`,
    board: s.qualification.board.name,
  }));

  const topicOptions = topics.map((t) => ({
    id: t.id,
    label: t.topicName,
    subjectId: t.subjectId,
  }));

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Topic Challenges</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage topic challenges with bulk question import.
        </p>
      </div>
      <AdminChallengesClient
        challenges={challenges}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
      />
    </div>
  );
}
