import { prisma } from "@/lib/prisma";
import SyllabusClient from "./SyllabusClient";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "School Subject Syllabus Resources",
  description: "Find board-published syllabus documents for supported CBSE and Cambridge-focused subjects organized by qualification and class.",
  path: "/syllabus",
});

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
