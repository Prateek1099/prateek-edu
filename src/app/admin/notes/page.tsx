export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminNotesClient from "./AdminNotesClient";

export default async function AdminNotesPage() {
  const [notes, subjects] = await Promise.all([
    prisma.note.findMany({
      include: {
        subject: {
          include: {
            qualification: { include: { board: true } },
          },
        },
        topic: true,
      },
      orderBy: { id: "desc" },
      take: 300,
    }),
    prisma.subject.findMany({
      include: {
        qualification: { include: { board: true } },
        topics: { orderBy: { topicName: "asc" } },
      },
      orderBy: [
        { qualification: { board: { title: "asc" } } },
        { qualification: { title: "asc" } },
        { name: "asc" },
      ],
    }),
  ]);

  const subjectRows = subjects.map((s) => ({
    id: s.id,
    label: `${s.name}${s.code ? ` (${s.code})` : ""} · ${s.qualification.title} · ${s.qualification.board.title}`,
    topics: s.topics.map((t) => ({ id: t.id, topicName: t.topicName })),
  }));

  return <AdminNotesClient notes={notes} subjectRows={subjectRows} />;
}
