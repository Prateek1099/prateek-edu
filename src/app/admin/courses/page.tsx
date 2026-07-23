export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminCoursesClient from "./AdminCoursesClient";

export default async function AdminCoursesPage() {
  const [courses, subjects] = await Promise.all([
    prisma.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subject: {
          include: {
            qualification: { include: { board: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
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
  }));

  return <AdminCoursesClient courses={courses} subjectOptions={subjectOptions} />;
}
