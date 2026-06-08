"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  CreditCard,
  MessageSquare,
  LogOut,
  StickyNote,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: "exact" as const },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, match: "prefix" as const },
  { href: "/admin/papers", label: "Papers", icon: FileText, match: "prefix" as const },
  { href: "/admin/notes", label: "Notes", icon: StickyNote, match: "prefix" as const },
  { href: "/admin/challenges", label: "Challenges", icon: Trophy, match: "prefix" as const },
  { href: "/admin/users", label: "Users", icon: Users, match: "prefix" as const },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, match: "prefix" as const },
  { href: "/admin/insights", label: "Insights", icon: MessageSquare, match: "prefix" as const },
  { href: "/admin/queries", label: "Queries", icon: MessageSquare, match: "prefix" as const },
];

function linkActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname() || "";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/80 p-6">
        <Link href="/admin" className="block">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prateek Edu
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-primary">Admin</h1>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {nav.map(({ href, label, icon: Icon, match }) => {
          const active = linkActive(pathname, href, match);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0 opacity-90" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border/80 p-3">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
        >
          <LogOut className="size-5 shrink-0" />
          Sign out
        </Link>
      </div>
    </aside>
  );
}
