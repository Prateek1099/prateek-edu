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
  ClipboardList,
  Database,
  GraduationCap,
  ChevronDown,
  Layers,
  ListTree,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminBoard } from "./AdminBoardContext";



type NavItem = { href: string; label: string; icon: any; match: "exact" | "prefix" };

const contentNav: NavItem[] = [
  { href: "/admin/papers", label: "Past Papers", icon: FileText, match: "prefix" },
  { href: "/admin/notes", label: "Revision Notes", icon: StickyNote, match: "prefix" },
  { href: "/admin/syllabus", label: "Syllabus", icon: GraduationCap, match: "prefix" },
  { href: "/admin/question-bank", label: "Question Bank", icon: Database, match: "prefix" },
  { href: "/admin/challenges", label: "Challenges", icon: Trophy, match: "prefix" },
  { href: "/admin/worksheets", label: "Worksheets", icon: ClipboardList, match: "prefix" },
];

const adminNav: NavItem[] = [
  { href: "/admin/workspaces", label: "Workspaces", icon: Briefcase, match: "prefix" },
  { href: "/admin/users", label: "Users", icon: Users, match: "prefix" },
  { href: "/admin/payments", label: "Payments", icon: CreditCard, match: "prefix" },
  { href: "/admin/insights", label: "Insights", icon: MessageSquare, match: "prefix" },
  { href: "/admin/queries", label: "Queries", icon: MessageSquare, match: "prefix" },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, match: "prefix" },
];

const structureNav: NavItem[] = [
  { href: "/admin/academic-structure/boards", label: "Boards", icon: Layers, match: "prefix" },
  { href: "/admin/academic-structure/qualifications", label: "Qualifications", icon: GraduationCap, match: "prefix" },
  { href: "/admin/academic-structure/subjects", label: "Subjects", icon: BookOpen, match: "prefix" },
  { href: "/admin/academic-structure/topics", label: "Topics", icon: ListTree, match: "prefix" },
];

function linkActive(pathname: string, href: string, match: "exact" | "prefix") {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = linkActive(pathname, item.href, item.match);
  return (
    <Link
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
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {label}
    </p>
  );
}

export function AdminSidebar({ boards }: { boards: { value: string, label: string }[] }) {
  const pathname = usePathname() || "";
  const { selectedBoard, setSelectedBoard } = useAdminBoard();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/60 bg-card">
      {/* Header */}
      <div className="border-b border-border/60 p-5">
        <Link href="/admin" className="block">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Vexa
          </p>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight text-foreground">
            Admin Panel
          </h1>
        </Link>
      </div>

      {/* Global Board Selector */}
      <div className="border-b border-border/60 px-4 py-3">
        <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 block mb-1.5">
          Current Board
        </label>
        <div className="relative">
          <select
            value={selectedBoard}
            onChange={(e) => setSelectedBoard(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {boards.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col overflow-y-auto p-3">
        {/* Dashboard */}
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/admin"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <LayoutDashboard className="size-4 shrink-0 opacity-80" />
          Dashboard
        </Link>

        {/* Content Management */}
        <SectionLabel label="Content" />
        <div className="flex flex-col gap-0.5">
          {contentNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* Administration */}
        <SectionLabel label="Administration" />
        <div className="flex flex-col gap-0.5">
          {adminNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        {/* Academic Structure */}
        <SectionLabel label="Academic Structure" />
        <div className="flex flex-col gap-0.5">
          {structureNav.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
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
