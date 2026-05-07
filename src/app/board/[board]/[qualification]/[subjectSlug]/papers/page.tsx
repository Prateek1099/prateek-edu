import { prisma } from "@/lib/prisma";
import PapersClient from "./PapersClient";

export const dynamic = "force-dynamic";

export default async function SubjectPapersPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subjectSlug: string }>;
}) {
  const { board, qualification, subjectSlug } = await params;

  const papers = await prisma.paper.findMany({
    where: {
      subject: {
        slug: subjectSlug,
        qualification: {
          name: qualification,
          board: { name: board },
        },
      },
    },
    orderBy: [
      { year: "desc" },
      { season: "desc" },
      { paperNumber: "asc" },
      { variant: "asc" }
    ],
    include: {
      subject: true,
    },
  });

  return (
    <div className="w-full">
      <PapersClient initialPapers={papers} />
    </div>
  );
}
