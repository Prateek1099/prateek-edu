import { prisma } from "@/lib/prisma";
import SyllabusClient from "./SyllabusClient";

export const dynamic = "force-dynamic";

export default async function SyllabusPage() {
  const boards = await prisma.board.findMany({
    include: {
      qualifications: {
        include: {
          subjects: true,
        },
        orderBy: {
          title: "asc",
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });

  return <SyllabusClient boards={boards} />;
}
