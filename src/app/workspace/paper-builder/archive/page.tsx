import Link from "next/link";

import {
  PaperBuilderModeNav,
  WORKSPACE_PAPER_BUILDER_NAV_ITEMS,
} from "@/components/paper-builder/PaperBuilderModeNav";
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
        <p className="text-sm font-semibold text-primary">Papers · Library</p>
        <h1 className="text-3xl font-bold tracking-tight">Saved papers</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          Open finished papers you previously chose to save.
        </p>
      </header>
      <PaperBuilderModeNav
        mode="archive"
        items={WORKSPACE_PAPER_BUILDER_NAV_ITEMS}
        ariaLabel="Teacher Paper Builder navigation"
      />
      <div className="flex flex-wrap gap-2">
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
        These are actual generated papers. They remain private to your workspace and are not assigned automatically.
      </p>
    </div>
  );
}
