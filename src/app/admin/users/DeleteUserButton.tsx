"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteUserAction } from "./actions";

export default function DeleteUserButton({
  userId,
  userName,
  disabledReason,
}: {
  userId: string;
  userName: string | null;
  disabledReason?: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  if (disabledReason) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title={disabledReason}
        aria-label={disabledReason}
        className="h-8 px-2"
      >
        <Shield className="h-4 w-4 text-muted-foreground" />
      </Button>
    );
  }

  async function handleDelete() {
    if (
      confirm(
        `Delete ${userName || "this user"}? This is only allowed for an empty account with no learning, workspace, subscription, or payment history.`
      )
    ) {
      setIsDeleting(true);
      const res = await deleteUserAction(userId);
      if (!res.success) {
        toast.error(res.error || "Failed to delete user");
        setIsDeleting(false);
        return;
      }

      toast.success("Empty user account deleted");
      router.refresh();
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      onClick={handleDelete}
      disabled={isDeleting}
      className="h-8 px-2"
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete empty user</span>
    </Button>
  );
}
