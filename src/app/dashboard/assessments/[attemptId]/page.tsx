import { AlertCircle, ChevronLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentRunnerClient } from "./AssessmentRunnerClient";
import { Button, buttonVariants } from "@/components/ui/button";
import { runnerDeliveryRecovery } from "@/lib/assessments/rules";
import { assessmentService } from "@/lib/assessments/service";
import { cn } from "@/lib/utils";

export default async function StudentAssessmentRunnerPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  let delivery;
  try {
    delivery = await assessmentService.delivery(attemptId);
  } catch (error) {
    const recovery = runnerDeliveryRecovery(error);
    if (recovery === "FINALIZE_EXPIRED") {
      await assessmentService.finalizeExpiredObjective(attemptId);
      redirect(`/dashboard/assessments/${attemptId}/result`);
    }
    if (recovery === "VIEW_RESULT") redirect(`/dashboard/assessments/${attemptId}/result`);
    if (recovery === "RETRY") {
      return <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
          <AlertCircle className="mx-auto size-10 text-amber-600 dark:text-amber-300" />
          <h1 className="mt-4 text-2xl font-bold">We couldn&apos;t load your test right now</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">No submission was made. Refresh this page to try loading the test again.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <form action={`/dashboard/assessments/${attemptId}`} method="get"><Button type="submit" className="w-full"><RefreshCw className="size-4" /> Try again</Button></form>
            <Link href="/dashboard/worksheets" className={cn(buttonVariants({variant:"outline"}))}><ChevronLeft className="size-4" /> Assigned work</Link>
          </div>
        </section>
      </main>;
    }
    throw error;
  }
  return <AssessmentRunnerClient delivery={delivery} />;
}
