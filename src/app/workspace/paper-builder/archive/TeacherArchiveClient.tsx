"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-4 xl:grid-cols-2">
      {papers.map((paper) => (
        <Card key={paper.id}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="break-words">{paper.name}</CardTitle>
                <CardDescription className="mt-1">
                  {paper.description || `${paper.subjectName} paper`}
                </CardDescription>
              </div>
              <Badge variant={paper.archivedAt ? "outline" : "secondary"}>
                {paper.archivedAt ? "Archived" : "Active"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Summary
                label="Academic scope"
                value={`${paper.boardTitle} · ${paper.qualificationTitle} · ${paper.subjectName}`}
              />
              <Summary
                label="Paper"
                value={`${paper.totalMarks} marks · ${paper.questionCount} questions`}
              />
              <Summary label="Duration" value={`${paper.durationMinutes} minutes`} />
              <Summary label="Created" value={formatAdminDateTime(paper.createdAt)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/workspace/paper-builder/archive/${paper.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLink className="size-4" /> Open
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
          </CardContent>
        </Card>
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
