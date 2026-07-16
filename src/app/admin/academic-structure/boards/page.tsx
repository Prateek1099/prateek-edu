export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminBoardsClient from "./AdminBoardsClient";

export default async function AdminBoardsPage() {
  const boards = await prisma.board.findMany({
    include: {
      _count: {
        select: { qualifications: true }
      }
    },
    orderBy: { title: "asc" }
  });

  return <AdminBoardsClient boards={boards} />;
}
