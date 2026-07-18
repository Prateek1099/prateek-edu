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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ElementType; match: "exact" | "prefix" };

const navItems: NavItem[] = [
  { href: "/workspace", label: "Dashboard", icon: LayoutDashboard, match: "exact" },
  { href: "/workspace/classes", label: "Classes", icon: Users, match: "prefix" },
  { href: "/workspace/students", label: "Students", icon: UserCircle, match: "prefix" },
  { href: "/workspace/question-bank", label: "Question Bank", icon: Database, match: "prefix" },
  { href: "/workspace/worksheets", label: "Worksheets", icon: FileText, match: "prefix" },
  { href: "/workspace/quick-practice", label: "Quick Practice", icon: Zap, match: "prefix" },
  { href: "/workspace/settings", label: "Settings", icon: Settings, match: "prefix" },
];

function linkActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceSidebar({ workspaceName }: { workspaceName: string }) {
  const pathname = usePathname() || "";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-card">
      {/* Header */}
      <div className="border-b border-border/60 p-5">
        <Link href="/workspace" className="block">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Workspace
          </p>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="size-5 text-primary" />
            {workspaceName}
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto p-3">
        <div className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = linkActive(pathname, item.href, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
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
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
