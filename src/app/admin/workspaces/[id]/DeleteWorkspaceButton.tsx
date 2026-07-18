"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteWorkspace } from "@/app/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DeleteWorkspaceButtonProps {
  workspaceId: string;
  workspaceName: string;
}

export default function DeleteWorkspaceButton({ workspaceId, workspaceName }: DeleteWorkspaceButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmText === "DELETE";

  const handleDelete = () => {
    if (!isConfirmed) return;
    
    startTransition(async () => {
      try {
        await deleteWorkspace(workspaceId);
        setIsOpen(false);
        router.push("/admin/workspaces");
        router.refresh();
      } catch (error) {
        console.error("Failed to delete workspace:", error);
        alert("Failed to delete workspace. See console for details.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button variant="destructive" size="sm" className="gap-2">
            <Trash2 className="size-4" />
            Delete Workspace
          </Button>
        } 
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Delete Workspace
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-3">
            <div className="text-sm">
              This action is <strong>irreversible</strong>. You are about to permanently delete the workspace <strong>{workspaceName}</strong>.
            </div>
            <div className="text-sm">
              This will also permanently delete the teacher's user account, all associated classes, class memberships, and workspace content (worksheets, notes, challenges). Global content like Question Bank items will be preserved.
            </div>
            <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20 text-destructive text-sm">
              Please type <strong>DELETE</strong> to confirm.
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="mt-2 font-mono"
              autoComplete="off"
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setConfirmText("");
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
          >
            {isPending ? "Deleting..." : "Permanently Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
