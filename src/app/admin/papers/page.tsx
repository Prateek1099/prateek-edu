export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminPapersClient from "./AdminPapersClient";

export default async function AdminPapersPage() {
  const [papers, subjects] = await Promise.all([
    prisma.paper.findMany({
      include: {
        subject: {
          include: {
            qualification: { include: { board: true } },
          },
        },
      },
      orderBy: [
        { year: "desc" },
        { season: "desc" },
        { paperNumber: "asc" },
      ],
    }),
    prisma.subject.findMany({
      include: {
        qualification: { include: { board: true } },
      },
      orderBy: [
        { qualification: { board: { title: "asc" } } },
        { qualification: { title: "asc" } },
        { name: "asc" },
      ],
    }),
  ]);

  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    label: `${s.name}${s.code ? ` (${s.code})` : ""} · ${s.qualification.title} · ${s.qualification.board.title}`,
    board: s.qualification.board.name,
  }));

  return <AdminPapersClient papers={papers} subjectOptions={subjectOptions} />;
}
