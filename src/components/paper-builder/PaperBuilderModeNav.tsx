import Link from "next/link";

import { cn } from "@/lib/utils";

export type PaperBuilderMode = "simple" | "blueprint" | "templates" | "blueprint-templates" | "header-templates" | "archive";

export type PaperBuilderModeNavItem = {
  mode: PaperBuilderMode;
  href: string;
  label: string;
  emphasis?: "primary" | "secondary";
  description?: string;
};

export const ADMIN_PAPER_BUILDER_NAV_ITEMS: PaperBuilderModeNavItem[] = [
  { mode: "simple", href: "/admin/paper-builder", label: "Simple Builder" },
  { mode: "blueprint", href: "/admin/paper-builder/blueprint", label: "Blueprint Builder" },
  { mode: "templates", href: "/admin/paper-builder/blueprint/templates", label: "Blueprint Templates" },
  { mode: "archive", href: "/admin/paper-builder/archive", label: "Paper Archive" },
];

export const WORKSPACE_PAPER_BUILDER_NAV_ITEMS: PaperBuilderModeNavItem[] = [
  {
    mode: "simple",
    href: "/workspace/paper-builder",
    label: "Quick Paper",
    emphasis: "primary",
    description: "Choose topics, question types and marks. Vexa can help choose the questions.",
  },
  {
    mode: "blueprint",
    href: "/workspace/paper-builder/blueprint",
    label: "Chapter-wise Paper",
    emphasis: "primary",
    description: "Set an exact chapter-wise marks pattern before choosing questions.",
  },
  {
    mode: "templates",
    href: "/workspace/paper-builder/templates",
    label: "Saved paper setups",
    emphasis: "secondary",
    description: "Reuse a Quick Paper structure.",
  },
  {
    mode: "blueprint-templates",
    href: "/workspace/paper-builder/blueprint/templates",
    label: "Saved chapter patterns",
    emphasis: "secondary",
    description: "Reuse a chapter-wise marks pattern.",
  },
  {
    mode: "header-templates",
    href: "/workspace/paper-builder/header-templates",
    label: "Paper headers",
    emphasis: "secondary",
    description: "Reuse school and exam details.",
  },
  {
    mode: "archive",
    href: "/workspace/paper-builder/archive",
    label: "Saved papers",
    emphasis: "secondary",
    description: "Open a paper you previously saved.",
  },
];

export function TeacherPapersEntry() {
  const primaryItems = WORKSPACE_PAPER_BUILDER_NAV_ITEMS.filter(
    (item) => item.emphasis === "primary",
  );
  const secondaryItems = WORKSPACE_PAPER_BUILDER_NAV_ITEMS.filter(
    (item) => item.emphasis === "secondary",
  );

  return (
    <section className="paper-builder-screen-only space-y-6" aria-labelledby="choose-paper-workflow">
      <div>
        <h2 id="choose-paper-workflow" className="text-xl font-semibold">
          What kind of paper do you want to create?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start quickly or plan marks chapter by chapter.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {primaryItems.map((item) => (
          <article key={item.mode} className="flex min-w-0 flex-col rounded-2xl border bg-card p-5">
            <h3 className="text-lg font-semibold">{item.label}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
            <Link
              href={item.mode === "simple" ? `${item.href}#quick-paper-builder` : item.href}
              className="mt-5 inline-flex min-h-11 w-fit items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Create {item.label}
            </Link>
          </article>
        ))}
      </div>

      <div className="space-y-3 border-t pt-5">
        <div>
          <h2 className="text-base font-semibold">Reuse &amp; manage</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Optional tools that support paper creation.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {secondaryItems.map((item) => (
            <Link
              key={item.mode}
              href={item.href}
              className="min-w-0 rounded-xl border px-3 py-3 transition-colors hover:border-foreground/20 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <span className="block text-[15px] font-semibold leading-5">{item.label}</span>
              <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PaperBuilderModeNav({
  mode,
  items = ADMIN_PAPER_BUILDER_NAV_ITEMS,
  ariaLabel = "Paper Builder mode",
}: {
  mode: PaperBuilderMode;
  items?: PaperBuilderModeNavItem[];
  ariaLabel?: string;
}) {
  const isTeacherNavigation = items === WORKSPACE_PAPER_BUILDER_NAV_ITEMS;

  if (isTeacherNavigation) {
    const primaryItems = items.filter((item) => item.emphasis === "primary");
    const secondaryItems = items.filter((item) => item.emphasis === "secondary");
    const activeSecondary = secondaryItems.find((item) => item.mode === mode);

    return (
      <div className="paper-builder-screen-only space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Create
          </p>
          <nav className="grid grid-cols-2 gap-2" aria-label={ariaLabel}>
            {primaryItems.map((item) => (
              <Link
                key={item.mode}
                href={item.href}
                aria-current={mode === item.mode ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-0 items-center justify-center rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === item.mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden border-t pt-3 sm:block">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs font-semibold text-muted-foreground">Reuse &amp; manage</span>
            {secondaryItems.map((item) => (
              <Link
                key={item.mode}
                href={item.href}
                aria-current={mode === item.mode ? "page" : undefined}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === item.mode
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <details className="group border-t pt-3 sm:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-sm font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span>{activeSecondary ? activeSecondary.label : "Reuse & manage"}</span>
            <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <nav className="mt-2 grid gap-1" aria-label="Paper reuse and management">
            {secondaryItems.map((item) => (
              <Link
                key={item.mode}
                href={item.href}
                aria-current={mode === item.mode ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  mode === item.mode
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </details>
      </div>
    );
  }

  return (
    <div className="paper-builder-screen-only">
      <nav className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl border bg-muted/40 p-1" aria-label={ariaLabel}>
        {items.map((item) => (
          <Link
            key={item.mode}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-2 font-semibold transition-colors",
              item.emphasis === "secondary" ? "text-xs" : "text-sm",
              mode === item.mode
                ? "bg-background text-foreground shadow-sm"
                : item.emphasis === "secondary"
                  ? "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  : "text-foreground hover:bg-background/70",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
