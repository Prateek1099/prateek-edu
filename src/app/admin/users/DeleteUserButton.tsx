"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteUserAction } from "./actions";

export default function DeleteUserButton({ userId, userName }: { userId: string, userName: string | null }) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (confirm(`Are you sure you want to permanently delete ${userName || 'this user'}?`)) {
      setIsDeleting(true);
      const res = await deleteUserAction(userId);
      if (!res.success) {
        alert(res.error || "Failed to delete user");
        setIsDeleting(false);
      }
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
      <span className="sr-only">Delete</span>
    </Button>
  );
}
