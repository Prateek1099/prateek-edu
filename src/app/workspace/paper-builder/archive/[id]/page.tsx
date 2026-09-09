import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { SavedPaperViewerClient } from "@/components/paper-builder/SavedPaperViewerClient";
import { buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { listSavedPaperOnlineAssignments } from "@/lib/assessments/teacher-queries";
import { requireActiveWorkspace } from "@/lib/require-role";

import { getTeacherSavedGeneratedPaper } from "../actions";

export const dynamic = "force-dynamic";

export default async function TeacherSavedGeneratedPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireActiveWorkspace();
  const id=(await params).id;
  const [saved,onlineAssignments] = await Promise.all([
    getTeacherSavedGeneratedPaper(id),
    listSavedPaperOnlineAssignments(id),
  ]);
  if (!saved) notFound();

  return (
    <div className="space-y-6">
      <section className="paper-builder-screen-only rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-lg font-semibold">Use this paper online</h2><p className="mt-1 text-sm text-muted-foreground">Conduct this saved paper as a timed test for one of your classes.</p></div>
          {!saved.archivedAt?<Link href={`/workspace/paper-builder/archive/${saved.id}/assign-online`} className={buttonVariants()}><ClipboardCheck className="size-4"/> Assign Online Test</Link>:null}
        </div>
        {onlineAssignments.length>0?<div className="mt-5 divide-y rounded-xl border">{onlineAssignments.map(assignment=><div key={assignment.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{assignment.className}</p><p className="text-xs text-muted-foreground">{assignment.recipientCount} students · Assigned {formatAdminDateTime(assignment.assignedAt)}{assignment.cancelledAt?" · Cancelled":""}</p></div><Link href={`/workspace/assessments/${assignment.id}`} className={buttonVariants({variant:"outline",size:"sm"})}>View results</Link></div>)}</div>:null}
      </section>
      <SavedPaperViewerClient
        saved={saved}
        archiveHref="/workspace/paper-builder/archive"
        archiveLabel="Saved papers"
        teacherFriendly
      />
    </div>
  );
}
