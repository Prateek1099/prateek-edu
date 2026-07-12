import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AdminBankClient from "./AdminBankClient";

export const dynamic = "force-dynamic";

export default async function AdminBankPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const [questions, subjects, topics] = await Promise.all([
    prisma.bankQuestion.findMany({
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
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
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <p className="text-muted-foreground mt-1">
          The central repository for all multiple choice questions.
        </p>
      </div>
      <AdminBankClient
        initialQuestions={questions}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
      />
    </div>
  );
}
