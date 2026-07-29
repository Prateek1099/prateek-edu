"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markContactQueryResolved } from "./actions";

export default function ResolveQueryButton({ queryId }: { queryId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleResolve() {
    startTransition(async () => {
      const result = await markContactQueryResolved(queryId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success("Contact query marked as resolved");
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleResolve}
      disabled={isPending}
    >
      {isPending ? "Resolving…" : "Mark Resolved"}
    </Button>
  );
}
