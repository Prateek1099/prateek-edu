import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpenCheck,
  FileText,
  NotebookPen,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { publicMetadata } from "@/lib/seo";

type NoteRouteParams = { board: string; qualification: string; subject: string; id: string };

export async function generateMetadata({ params }: { params: Promise<NoteRouteParams> }) {
  const { board, qualification, subject, id } = await params;
  const note = await prisma.note.findFirst({
    where: {
      id,
      isPublished: true,
      subject: {
        slug: subject,
        status: "PUBLISHED",
        qualification: { name: qualification, status: "PUBLISHED", board: { name: board, status: "PUBLISHED" } },
      },
    },
    select: { title: true, content: true, noteType: true },
  });
  if (!note) return { title: "Study Note" };
  const noteLabel = note.noteType === "NOTEBOOK_WORK" ? "Notebook Work" : "Study Notes";
  return publicMetadata({
    title: `${note.title} — ${noteLabel}`,
    description: (note.content?.trim() || `Open ${note.title}, published as ${noteLabel} on Vexa.`).slice(0, 160),
    path: `/resources/${board}/${qualification}/${subject}/notes/${id}`,
  });
}

export default async function StudentTextNotePage({
  params,
}: {
  params: Promise<NoteRouteParams>;
}) {
  const { board, qualification, subject, id } = await params;

  const note = await prisma.note.findFirst({
    where: {
      id,
      isPublished: true,
      subject: {
        slug: subject,
        status: "PUBLISHED",
        qualification: {
          name: qualification,
          status: "PUBLISHED",
          board: {
            name: board,
            status: "PUBLISHED",
          },
        },
      },
    },
    include: {
      subject: true,
      topic: true,
    },
  });

  if (!note) notFound();

  if (!note.content?.trim()) {
    if (note.pdfUrl) {
      redirect(
        `/notes/viewer?pdf=${encodeURIComponent(note.pdfUrl)}&title=${encodeURIComponent(note.title)}`,
      );
    }
    notFound();
  }

  const isNotebookWork = note.noteType === "NOTEBOOK_WORK";
  const TypeIcon = isNotebookWork ? NotebookPen : BookOpenCheck;
  const backUrl = `/resources/${board}/${qualification}/${subject}`;

  return (
    <main className="relative min-h-[calc(100vh-140px)] bg-background px-4 py-8 sm:px-6 sm:py-12">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href={backUrl}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5"
          >
            <ArrowLeft className="size-4" />
            <span>Back to {note.subject.name} notes</span>
          </Link>
        </div>

        <article className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg">
          <header className="border-b border-border/60 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl border shadow-2xs",
                  isNotebookWork
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                    : "bg-primary/10 border-primary/20 text-primary",
                )}
              >
                <TypeIcon className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-2.5 py-0.5 rounded-lg">
                    {isNotebookWork ? "Notebook Work" : "Study Notes"}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-lg">Text note</Badge>
                  {note.topic && (
                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-lg">{note.topic.topicName}</Badge>
                  )}
                </div>
                <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {note.title}
                </h1>
                <p className="mt-1 text-xs sm:text-sm font-medium text-muted-foreground">
                  {note.subject.name}
                </p>
              </div>
            </div>
          </header>

          <div className="p-6 sm:p-8 md:p-10 space-y-6">
            <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed sm:leading-8 text-foreground font-normal">
              {note.content}
            </div>

            {note.pdfUrl && (
              <div className="pt-6 border-t border-border/60">
                <Link
                  href={`/notes/viewer?pdf=${encodeURIComponent(note.pdfUrl)}&title=${encodeURIComponent(note.title)}`}
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-11 gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-xs",
                  )}
                >
                  <FileText className="size-4" />
                  Open attached PDF
                </Link>
              </div>
            )}
          </div>
        </article>
      </div>
    </main>
  );
}
