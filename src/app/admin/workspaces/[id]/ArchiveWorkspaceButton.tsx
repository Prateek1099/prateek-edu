"use client";

import { useState, useTransition } from "react";
import { Archive, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveWorkspace } from "@/app/actions/workspace";
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

interface ArchiveWorkspaceButtonProps {
  workspaceId: string;
  workspaceName: string;
  isArchived: boolean;
}

export default function ArchiveWorkspaceButton({
  workspaceId,
  workspaceName,
  isArchived,
}: ArchiveWorkspaceButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmText === "ARCHIVE";

  const handleArchive = () => {
    if (!isConfirmed) return;
    
    startTransition(async () => {
      try {
        await archiveWorkspace(workspaceId);
        setIsOpen(false);
        toast.success("Workspace archived. Its owner and all workspace data were preserved.");
        router.push("/admin/workspaces");
        router.refresh();
      } catch (error) {
        console.error("Failed to archive workspace:", error);
        toast.error("Failed to archive workspace.");
      }
    });
  };

  if (isArchived) {
    return (
      <Button variant="outline" size="sm" className="gap-2" disabled>
        <Archive className="size-4" />
        Archived
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger 
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <Archive className="size-4" />
            Archive Workspace
          </Button>
        } 
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Archive Workspace
          </DialogTitle>
          <DialogDescription className="pt-2 space-y-3">
            <div className="text-sm">
              You are about to archive <strong>{workspaceName}</strong>.
            </div>
            <div className="text-sm">
              The teacher account, classes, memberships, learning history, and workspace content will all be preserved. The workspace can be reactivated later.
            </div>
            <div className="bg-amber-500/10 p-3 rounded-md border border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
              Please type <strong>ARCHIVE</strong> to confirm.
            </div>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type ARCHIVE"
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
            disabled={!isConfirmed || isPending}
            onClick={handleArchive}
          >
            {isPending ? "Archiving..." : "Archive Workspace"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
