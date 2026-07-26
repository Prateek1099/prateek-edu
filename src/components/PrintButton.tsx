"use client";

import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

export function PrintButton({
  label = "Print Weekly Report",
  icon,
  className,
}: {
  label?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={() => window.print()}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring print:hidden",
        className,
      )}
    >
      {icon || <Printer className="size-4" />}
      {label}
    </button>
  );
}
