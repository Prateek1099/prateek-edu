"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu, User as UserIcon, BookOpen, Settings, LogOut, ChevronDown, Repeat } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { useSession, signOut } from 'next-auth/react';
import type { Session } from "next-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { GlobalSearch, GlobalSearchTrigger } from "./GlobalSearch";
import { clearEcosystemPreference } from "@/app/actions/resources-actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type EcosystemPreference = { board: string; boardTitle: string; qualTitle?: string | null };

function UserDropdown({ session }: { session: Session }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative size-9 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center transition-transform hover:scale-105"
        aria-label="User menu"
      >
        <Avatar className="size-9 border border-primary/20 ring-2 ring-primary/10">
          <AvatarImage src={session.user?.image || ''} alt="Avatar" />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
            {session.user?.name ? session.user.name.charAt(0).toUpperCase() : <UserIcon className="size-4" />}
          </AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl bg-popover border border-border/80 ring-1 ring-black/5 dark:ring-white/10 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
          <div className="px-3 py-2 border-b border-border/60 mb-1">
            <p className="text-xs font-semibold text-foreground truncate">{session.user?.name || "Student"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <BookOpen className="mr-2.5 size-4 text-primary" />
            <span>{(session.user as { role?: string }).role === "STUDENT" ? "Student home" : "Dashboard"}</span>
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center w-full px-3 py-2 text-xs sm:text-sm font-medium rounded-xl hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="mr-2.5 size-4 text-muted-foreground" />
            <span>Settings</span>
          </Link>
          <div className="h-px bg-border/60 my-1" />
          <button
            onClick={() => { setIsOpen(false); signOut(); }}
            className="flex items-center w-full px-3 py-2 text-xs sm:text-sm font-medium text-destructive rounded-xl hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="mr-2.5 size-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

function EcosystemSwitcher({ preference, mobile = false }: { preference: EcosystemPreference; mobile?: boolean }) {
  const router = useRouter();

  if (!preference) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={mobile
        ? "inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-left text-xs sm:text-sm font-semibold leading-snug text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0"
        : "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-3.5 text-xs font-semibold text-primary transition-all hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0"
      }>
        <span className={mobile ? "min-w-0 break-words" : "truncate max-w-40"}>
          {preference.boardTitle} {preference.qualTitle && `• ${preference.qualTitle}`}
        </span>
        <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? "start" : "end"} className="w-56 max-w-[calc(100vw-2rem)] rounded-2xl border border-border/80 p-1.5 shadow-xl">
        <DropdownMenuItem
          className="cursor-pointer flex items-center rounded-xl px-3 py-2 text-xs sm:text-sm font-medium"
          onClick={() => router.push(`/resources/${preference.board}`)}
        >
          <BookOpen className="size-4 mr-2.5 text-primary" /> Change Qualification
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center rounded-xl px-3 py-2 text-xs sm:text-sm font-medium mt-0.5"
          onClick={async () => {
            await clearEcosystemPreference();
            window.location.href = '/resources';
          }}
        >
          <Repeat className="size-4 mr-2.5" /> Switch Ecosystem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function NavbarClient({ preference }: { preference: EcosystemPreference | null }) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const routes = [
    { label: status === "authenticated" ? "Dashboard" : "Home", href: status === "authenticated" ? "/dashboard" : "/" },
    { label: "Courses", href: "/courses" },
  ];

  if (preference && !routes.some((route) => route.href === "/resources")) {
    routes.push({ label: 'Resources', href: '/resources' });
  }

  return (
    <>
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 max-w-7xl min-w-0 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-xl transition-transform hover:scale-105 outline-none">
          <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
            <GraduationCap className="size-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Vexa
          </span>
        </Link>

        {/* Mobile Nav Trigger & Theme Toggle */}
        <div className="flex shrink-0 items-center gap-2 xl:hidden">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="flex size-10 items-center justify-center rounded-xl border border-border/80 bg-card transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[390px]:size-10 shadow-sm">
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[calc(100vw-1rem)] max-w-sm overflow-y-auto p-6 sm:w-full border-border/80 bg-card rounded-l-3xl shadow-2xl"
            >
              <SheetTitle className="flex items-center gap-2.5 pr-10 text-lg font-bold">
                <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
                  <GraduationCap className="size-5 text-primary" />
                </div>
                <span>Vexa</span>
              </SheetTitle>
              <SheetDescription className="sr-only">
                Vexa navigation, search, account, and academic ecosystem controls.
              </SheetDescription>

              <nav className="mt-6 flex flex-col gap-2 text-sm font-medium">
                {preference && (
                  <div className="mb-3 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Academic Ecosystem</p>
                    <EcosystemSwitcher preference={preference} mobile />
                  </div>
                )}

                <GlobalSearchTrigger
                  className="mb-3 h-11 w-full md:w-full lg:w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                />

                <div className="space-y-1">
                  {routes.map((route) => {
                    const isActive = pathname === route.href
                      || (route.href !== "/" && route.href !== "/dashboard" && pathname.startsWith(route.href));
                    return (
                      <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                          "flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-foreground/80 hover:bg-accent hover:text-foreground"
                        )}
                        onClick={() => setMobileOpen(false)}
                      >
                        {route.label}
                      </Link>
                    );
                  })}
                </div>

                {status === 'authenticated' ? (
                  <div className="mt-4 pt-4 border-t border-border/80 space-y-1">
                    <Link
                      href="/dashboard"
                      className="flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <BookOpen className="size-4 text-primary" /> Dashboard
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Settings className="size-4 text-muted-foreground" /> Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="w-full min-h-11 justify-start px-3.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => { setMobileOpen(false); signOut(); }}
                    >
                      <LogOut className="size-4 mr-2.5" /> Logout
                    </Button>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-border/80">
                    <Link href="/login" className="w-full" onClick={() => setMobileOpen(false)}>
                      <Button className="h-11 w-full rounded-xl text-sm font-semibold shadow-md">Login</Button>
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center space-x-2 text-sm font-medium xl:flex">
          {routes.map((route) => {
            const isActive = pathname === route.href
              || (route.href !== "/" && route.href !== "/dashboard" && pathname.startsWith(route.href));
            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-sm font-semibold transition-all",
                  isActive
                    ? "text-primary bg-primary/10 border border-primary/20 shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                {route.label}
              </Link>
            );
          })}

          <div className="h-4 w-px bg-border/80 mx-2"></div>

          {preference && <EcosystemSwitcher preference={preference} />}

          <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
          <ThemeToggle />

          {status === 'authenticated' ? (
            <UserDropdown session={session} />
          ) : (
            <Link href="/login">
              <Button variant="default" className="rounded-xl px-5 h-9 text-xs sm:text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-md">
                Login
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
