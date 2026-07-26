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

export default async function StudentTextNotePage({
  params,
}: {
  params: Promise<{
    board: string;
    qualification: string;
    subject: string;
    id: string;
  }>;
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
    <main className="min-h-[calc(100vh-140px)] bg-muted/20 px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to {note.subject.name} notes
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
          <header className="border-b px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl",
                  isNotebookWork
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                    : "bg-primary/10 text-primary",
                )}
              >
                <TypeIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {isNotebookWork ? "Notebook Work" : "Study Notes"}
                  </Badge>
                  <Badge variant="outline">Text note</Badge>
                  {note.topic && (
                    <Badge variant="outline">{note.topic.topicName}</Badge>
                  )}
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                  {note.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {note.subject.name}
                </p>
              </div>
            </div>
          </header>

          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="whitespace-pre-wrap text-[0.98rem] leading-7 text-foreground sm:text-base sm:leading-8">
              {note.content}
            </div>

            {note.pdfUrl && (
              <div className="mt-8 border-t pt-6">
                <Link
                  href={`/notes/viewer?pdf=${encodeURIComponent(note.pdfUrl)}&title=${encodeURIComponent(note.title)}`}
                  className={cn(
                    buttonVariants({ size: "lg", variant: "outline" }),
                    "h-11 gap-2",
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
