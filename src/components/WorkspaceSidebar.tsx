"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Briefcase,
  UserCircle,
  Database,
  FileStack,
  Archive,
  Zap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ElementType; match: "exact" | "prefix" };

const navItems: NavItem[] = [
  { href: "/workspace", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/workspace/classes", label: "Classes", icon: Users, match: "prefix" },
  { href: "/workspace/students", label: "Students", icon: UserCircle, match: "prefix" },
  { href: "/workspace/question-bank", label: "Question Bank", icon: Database, match: "prefix" },
  { href: "/workspace/paper-builder", label: "Paper Builder", icon: FileStack, match: "exact" },
  { href: "/workspace/paper-builder/archive", label: "Paper Archive", icon: Archive, match: "prefix" },
  { href: "/workspace/worksheets", label: "Worksheets", icon: FileText, match: "prefix" },
  { href: "/workspace/quick-practice", label: "Quick Practice", icon: Zap, match: "prefix" },
  { href: "/workspace/settings", label: "Settings", icon: Settings, match: "prefix" },
];

function linkActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function WorkspaceNavigation({
  pathname,
  workspaceName,
  onNavigate,
}: {
  pathname: string;
  workspaceName: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="border-b border-border/60 p-5">
        <Link href="/workspace" className="block" onClick={onNavigate}>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Workspace
          </p>
          <h1 className="mt-0.5 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Briefcase className="size-5 shrink-0 text-primary" />
            <span className="truncate">{workspaceName}</span>
          </h1>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto p-3">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = linkActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="size-4 shrink-0 opacity-80" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sign out */}
      <div className="border-t border-border/60 p-3">
        <Link
          href="/api/auth/signout"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </Link>
      </div>
    </>
  );
}

export function WorkspaceSidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname() || "";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur lg:hidden print:hidden">
        <Link href="/workspace" className="flex min-w-0 items-center gap-2 font-bold" onClick={() => setMobileOpen(false)}>
          <Briefcase className="size-5 shrink-0 text-primary" />
          <span className="truncate">{workspaceName}</span>
        </Link>
        <button
          type="button"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border bg-card text-foreground shadow-sm"
          aria-label="Open workspace navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-5" />
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden print:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close workspace navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-border/60 bg-card shadow-2xl">
            <button
              type="button"
              className="absolute right-3 top-3 inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close workspace navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-5" />
            </button>
            <WorkspaceNavigation
              pathname={pathname}
              workspaceName={workspaceName}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}

      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-card lg:flex print:hidden">
        <WorkspaceNavigation pathname={pathname} workspaceName={workspaceName} />
      </aside>
    </>
  );
}
