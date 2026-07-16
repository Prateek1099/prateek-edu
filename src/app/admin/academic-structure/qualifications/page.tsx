export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminQualificationsClient from "./AdminQualificationsClient";

export default async function AdminQualificationsPage() {
  const qualifications = await prisma.qualification.findMany({
    include: {
      board: true,
      _count: {
        select: { subjects: true }
      }
    },
    orderBy: [
      { board: { title: "asc" } },
      { sortOrder: "asc" },
      { title: "asc" }
    ]
  });

  const boards = await prisma.board.findMany({
    orderBy: { title: "asc" }
  });

  return <AdminQualificationsClient qualifications={qualifications} boards={boards} />;
}
