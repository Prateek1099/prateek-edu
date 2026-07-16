export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminSubjectsClient from "./AdminSubjectsClient";

export default async function AdminSubjectsPage() {
  const subjects = await prisma.subject.findMany({
    include: {
      qualification: { include: { board: true } },
      _count: {
        select: { topics: true }
      }
    },
    orderBy: [
      { qualification: { board: { title: "asc" } } },
      { qualification: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  });

  const qualifications = await prisma.qualification.findMany({
    include: { board: true },
    orderBy: [
      { board: { title: "asc" } },
      { sortOrder: "asc" }
    ]
  });

  return <AdminSubjectsClient subjects={subjects} qualifications={qualifications} />;
}
