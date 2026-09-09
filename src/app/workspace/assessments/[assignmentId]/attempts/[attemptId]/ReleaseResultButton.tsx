"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { releaseOnlineAssessmentResult } from "../../actions";

export function ReleaseResultButton({
  assignmentId,
  attemptId,
  initiallyReleased,
}: {
  assignmentId: string;
  attemptId: string;
  initiallyReleased: boolean;
}) {
  const router = useRouter();
  const [released, setReleased] = useState(initiallyReleased);
  const [pending, startTransition] = useTransition();

  if (released) {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Released</Badge>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
        Ready to release
      </Badge>
      <Button
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const result = await releaseOnlineAssessmentResult(assignmentId, attemptId);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setReleased(true);
          toast.success("Result released to the student.");
          router.refresh();
        })}
      >
        <Send className="size-4" />
        {pending ? "Releasing…" : "Release result"}
      </Button>
    </div>
  );
}
