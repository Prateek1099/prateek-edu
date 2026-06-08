"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import { StudentReflectionCard, type AskTeacherContext } from "@/app/dashboard/StudentReflectionCard";

type Props = {
  context: AskTeacherContext;
  buttonLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
};

export function AskTeacherDialog({ 
  context, 
  buttonLabel = "Ask Teacher", 
  variant = "outline",
  className 
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* @ts-expect-error asChild is valid for Radix UI but missing in local types */}
      <DialogTrigger asChild>
        <Button variant={variant} size="sm" className={className}>
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          {buttonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
        <StudentReflectionCard 
          prefillContext={context} 
          onSuccess={() => {
            setTimeout(() => setOpen(false), 2000);
          }} 
        />
      </DialogContent>
    </Dialog>
  );
}
