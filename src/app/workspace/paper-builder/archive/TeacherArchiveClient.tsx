"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import type { SavedGeneratedPaperSummary } from "@/lib/paper-builder/saved-paper-types";

import {
  archiveTeacherSavedGeneratedPaper,
  restoreTeacherSavedGeneratedPaper,
} from "./actions";

export default function TeacherArchiveClient({
  papers,
  status,
}: {
  papers: SavedGeneratedPaperSummary[];
  status: "active" | "archived";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const mutate = (
    work: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
  ) => {
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.success) {
          toast.error(result.error ?? "The saved paper could not be changed.");
          return;
        }
        toast.success(successMessage);
        router.refresh();
      } catch {
        toast.error("The saved paper changed in another session or could not be updated.");
      }
    });
  };

  if (papers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <h2 className="font-semibold">
          {status === "archived" ? "No archived papers" : "No saved papers yet"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "archived"
            ? "Archived workspace papers will appear here."
            : "Papers you choose to save will appear here."}
        </p>
        {status === "active" && (
          <Link
            href="/workspace/paper-builder"
            className={buttonVariants({ className: "mt-4" })}
          >
            Open Quick Paper
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-2xl border bg-card">
      {papers.map((paper) => (
        <article key={paper.id} className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold">{paper.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paper.description || `${paper.subjectName} paper`}
                </p>
              </div>
              <Badge variant={paper.archivedAt ? "outline" : "secondary"}>
                {paper.archivedAt ? "Archived" : "Active"}
              </Badge>
            </div>
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Summary
                label="Subject"
                value={paper.subjectName}
              />
              <Summary
                label="Paper"
                value={`${paper.totalMarks} marks · ${paper.questionCount} questions`}
              />
              <Summary label="Duration" value={`${paper.durationMinutes} minutes`} />
              <Summary label="Saved" value={formatAdminDateTime(paper.createdAt)} />
              <Summary label="Class / board" value={`${paper.qualificationTitle} · ${paper.boardTitle}`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/workspace/paper-builder/archive/${paper.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLink className="size-4" /> Open paper
              </Link>
              {paper.archivedAt ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    mutate(
                      () => restoreTeacherSavedGeneratedPaper(paper.id),
                      "Saved paper restored.",
                    )
                  }
                >
                  <RotateCcw className="size-4" /> Restore
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    mutate(
                      () => archiveTeacherSavedGeneratedPaper(paper.id),
                      "Saved paper archived.",
                    )
                  }
                >
                  <Archive className="size-4" /> Archive
                </Button>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}
