"use client";

import {
  GraduationCap,
  LogOut,
  Menu,
  Settings,
  User as UserIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STUDENT_ROUTES = [
  { label: "Home", href: "/dashboard" },
  { label: "My Classes", href: "/dashboard/classes" },
  { label: "Assigned Work", href: "/dashboard/worksheets" },
  { label: "Mistake Book", href: "/dashboard/mistakes" },
] as const;

function isRouteActive(pathname: string, href: string) {
  return pathname === href
    || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

function StudentAvatar() {
  const { data: session } = useSession();
  const name = session?.user?.name || "Student";

  return (
    <Avatar className="size-9 border border-primary/20 ring-2 ring-primary/10">
      <AvatarImage src={session?.user?.image || ""} alt="" />
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
        {session?.user?.name
          ? session.user.name.charAt(0).toUpperCase()
          : <UserIcon className="size-4" aria-hidden="true" />}
      </AvatarFallback>
      <span className="sr-only">{name}</span>
    </Avatar>
  );
}

function StudentAccountMenu() {
  const { data: session } = useSession();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Open student account menu"
      >
        <StudentAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-xl">
        <DropdownMenuLabel className="min-w-0">
          <span className="block truncate text-sm">{session?.user?.name || "Student"}</span>
          {session?.user?.email ? (
            <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
              {session.user.email}
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/dashboard/settings" />}
          className="cursor-pointer"
        >
            <Settings className="size-4" aria-hidden="true" />
            Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onSelect={() => signOut()}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StudentWorkspaceNav() {
  const pathname = usePathname() || "/dashboard";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8 xl:gap-9">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Vexa home"
          >
            <span className="flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <GraduationCap className="size-4" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">Vexa</span>
          </Link>

          <nav aria-label="Student workspace" className="hidden items-center gap-2 lg:flex xl:gap-3">
            {STUDENT_ROUTES.map((route) => {
              const active = isRouteActive(pathname, route.href);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {route.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <div className="hidden lg:block">
            <StudentAccountMenu />
          </div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="inline-flex size-10 items-center justify-center rounded-xl border border-input bg-background text-foreground shadow-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              aria-label="Open student navigation"
            >
              <Menu className="size-5" aria-hidden="true" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,calc(100vw-1rem))] p-6">
              <SheetTitle className="flex items-center gap-2.5 text-lg">
                <StudentAvatar />
                Student workspace
              </SheetTitle>
              <SheetDescription className="mt-1 text-left">
                Classes, assigned work and revision.
              </SheetDescription>

              <nav aria-label="Student workspace mobile" className="mt-6 space-y-1">
                {STUDENT_ROUTES.map((route) => {
                  const active = isRouteActive(pathname, route.href);
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {route.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-5 space-y-1 border-t border-border/80 pt-5">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold text-foreground/80 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Settings className="size-4" aria-hidden="true" />
                  Settings
                </Link>
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-start rounded-xl px-3.5 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setMobileOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Log out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
