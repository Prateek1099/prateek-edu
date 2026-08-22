import { notFound } from "next/navigation";

import { requireSuperAdmin } from "@/lib/require-role";

import { getSavedGeneratedPaper } from "../actions";
import SavedPaperClient from "./SavedPaperClient";

export const dynamic = "force-dynamic";

export default async function SavedGeneratedPaperPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const saved = await getSavedGeneratedPaper((await params).id);
  if (!saved) notFound();
  return <SavedPaperClient saved={saved} />;
}
