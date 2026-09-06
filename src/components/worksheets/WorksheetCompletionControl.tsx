"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { markAssignedWorksheetDone } from "@/app/actions/workspace-assignment-completion";
import { Button } from "@/components/ui/button";

export function WorksheetCompletionControl({
  recipientId,
  initialCompleted,
}: {
  recipientId: string;
  initialCompleted: boolean;
}) {
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-4" /> Marked done
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="lg"
      variant="outline"
      className="h-11 w-full rounded-xl sm:w-auto"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await markAssignedWorksheetDone(recipientId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setCompleted(true);
          toast.success(result.alreadyCompleted ? "Worksheet was already complete." : "Worksheet marked as done.");
          router.refresh();
        });
      }}
    >
      <CheckCircle2 className="mr-2 size-4" />
      {pending ? "Saving..." : "Mark as done"}
    </Button>
  );
}
