export const dynamic = "force-dynamic";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getTeacherRemedialPracticeContext } from "@/lib/remedial-practice/service";

import RemedialPracticeClient from "./RemedialPracticeClient";

export default async function TeacherRemedialPracticePage({
  params,
}: {
  params: Promise<{ id: string; batchId: string }>;
}) {
  const { id: classId, batchId } = await params;
  if (!classId || !batchId) notFound();

  const result = await getTeacherRemedialPracticeContext({ classId, batchId });
  if (!result.success) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-10">
        <Link href={`/workspace/classes/${classId}/assignments/${batchId}`} className="inline-flex">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 size-4" /> Back to assignment
          </Button>
        </Link>
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h1 className="text-xl font-bold">Follow-up practice is unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
        </div>
      </div>
    );
  }

  return <RemedialPracticeClient context={result.data} />;
}
