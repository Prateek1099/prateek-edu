import { notFound } from "next/navigation";

import { SavedPaperViewerClient } from "@/components/paper-builder/SavedPaperViewerClient";
import { requireActiveWorkspace } from "@/lib/require-role";

import { getTeacherSavedGeneratedPaper } from "../actions";

export const dynamic = "force-dynamic";

export default async function TeacherSavedGeneratedPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireActiveWorkspace();
  const saved = await getTeacherSavedGeneratedPaper((await params).id);
  if (!saved) notFound();

  return (
    <SavedPaperViewerClient
      saved={saved}
      archiveHref="/workspace/paper-builder/archive"
      archiveLabel="Workspace Paper Archive"
    />
  );
}
