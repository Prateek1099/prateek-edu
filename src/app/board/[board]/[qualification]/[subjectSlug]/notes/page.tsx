import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NotesClient from "./NotesClient";

export const dynamic = "force-dynamic";

export default async function SubjectNotesPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subjectSlug: string }>;
}) {
  const { board, qualification, subjectSlug } = await params;

  const subject = await prisma.subject.findFirst({
    where: {
      slug: subjectSlug,
      qualification: {
        name: qualification,
        board: { name: board },
      },
    },
  });

  if (!subject) {
    notFound();
  }

  const notes = await prisma.note.findMany({
    where: { subjectId: subject.id },
    include: { topic: true },
    orderBy: { title: "asc" },
  });

  return <NotesClient initialNotes={notes} />;
}
