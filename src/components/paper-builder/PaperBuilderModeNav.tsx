import Link from "next/link";

import { cn } from "@/lib/utils";

export function PaperBuilderModeNav({ mode }: { mode: "simple" | "blueprint" | "templates" | "archive" }) {
  return (
    <nav className="paper-builder-screen-only flex w-fit max-w-full flex-wrap rounded-xl border bg-muted/40 p-1" aria-label="Paper Builder mode">
      <Link
        href="/admin/paper-builder"
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
          mode === "simple" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Simple Builder
      </Link>
      <Link
        href="/admin/paper-builder/blueprint"
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
          mode === "blueprint" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Blueprint Builder
      </Link>
      <Link
        href="/admin/paper-builder/blueprint/templates"
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
          mode === "templates" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Blueprint Templates
      </Link>
      <Link
        href="/admin/paper-builder/archive"
        className={cn(
          "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
          mode === "archive" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        Paper Archive
      </Link>
    </nav>
  );
}
