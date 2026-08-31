import Link from "next/link";

import { cn } from "@/lib/utils";

export type PaperBuilderMode = "simple" | "blueprint" | "templates" | "header-templates" | "archive";

export type PaperBuilderModeNavItem = {
  mode: PaperBuilderMode;
  href: string;
  label: string;
};

export const ADMIN_PAPER_BUILDER_NAV_ITEMS: PaperBuilderModeNavItem[] = [
  { mode: "simple", href: "/admin/paper-builder", label: "Simple Builder" },
  { mode: "blueprint", href: "/admin/paper-builder/blueprint", label: "Blueprint Builder" },
  { mode: "templates", href: "/admin/paper-builder/blueprint/templates", label: "Blueprint Templates" },
  { mode: "archive", href: "/admin/paper-builder/archive", label: "Paper Archive" },
];

export const WORKSPACE_PAPER_BUILDER_NAV_ITEMS: PaperBuilderModeNavItem[] = [
  { mode: "simple", href: "/workspace/paper-builder", label: "Simple Builder" },
  { mode: "blueprint", href: "/workspace/paper-builder/blueprint", label: "Blueprint Builder" },
  { mode: "templates", href: "/workspace/paper-builder/templates", label: "Simple Templates" },
  { mode: "header-templates", href: "/workspace/paper-builder/header-templates", label: "Header Templates" },
  { mode: "archive", href: "/workspace/paper-builder/archive", label: "Paper Archive" },
];

export function PaperBuilderModeNav({
  mode,
  items = ADMIN_PAPER_BUILDER_NAV_ITEMS,
  ariaLabel = "Paper Builder mode",
}: {
  mode: PaperBuilderMode;
  items?: PaperBuilderModeNavItem[];
  ariaLabel?: string;
}) {
  return (
    <nav className="paper-builder-screen-only flex w-fit max-w-full flex-wrap rounded-xl border bg-muted/40 p-1" aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.mode}
          href={item.href}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            mode === item.mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
