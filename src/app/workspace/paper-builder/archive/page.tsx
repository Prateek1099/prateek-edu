import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireActiveWorkspace } from "@/lib/require-role";

import TeacherArchiveClient from "./TeacherArchiveClient";
import { listTeacherSavedGeneratedPapers } from "./actions";

export const dynamic = "force-dynamic";

export default async function TeacherPaperArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  await requireActiveWorkspace();
  const query = await searchParams;
  const status = query.status === "archived" ? "archived" : "active";
  const papers = await listTeacherSavedGeneratedPapers(status);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Workspace Paper Archive</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          Reopen immutable papers saved by this workspace and reproduce their previews,
          answer keys, print output, and editable DOCX files.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/workspace/paper-builder"
          className={buttonVariants({ variant: "outline" })}
        >
          Paper Builder
        </Link>
        <Link
          href="/workspace/paper-builder/archive?status=active"
          className={buttonVariants({ variant: status === "active" ? "default" : "outline" })}
        >
          Active papers
        </Link>
        <Link
          href="/workspace/paper-builder/archive?status=archived"
          className={buttonVariants({ variant: status === "archived" ? "default" : "outline" })}
        >
          Archived papers
        </Link>
      </div>
      <TeacherArchiveClient papers={papers} status={status} />
      <p className="text-xs leading-5 text-muted-foreground">
        Saved papers remain private to this workspace. Phase 1C does not assign papers to
        students or permanently delete archive history.
      </p>
    </div>
  );
}
