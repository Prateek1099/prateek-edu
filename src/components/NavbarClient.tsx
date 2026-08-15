"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { GlobalSearch } from "./GlobalSearch";
import { clearEcosystemPreference } from "@/app/actions/resources-actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
        className="relative h-9 w-9 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring flex items-center justify-center"
      >
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={session.user?.image || ''} alt="Avatar" />
          <AvatarFallback className="bg-primary/10 text-primary">
            {session.user?.name ? session.user.name.charAt(0).toUpperCase() : <UserIcon className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover ring-1 ring-black/5 dark:ring-white/10 z-50 p-1 animate-in fade-in zoom-in duration-100">
          <Link 
            href="/dashboard" 
            className="flex items-center w-full px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>


          <div className="h-px bg-border my-1" />
          <Link 
            href="/dashboard/settings" 
            className="flex items-center w-full px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
          <button 
            onClick={() => { setIsOpen(false); signOut(); }}
            className="flex items-center w-full px-2 py-2 text-sm text-destructive rounded-md hover:bg-destructive/10 transition-colors mt-1"
          >
            <LogOut className="mr-2 h-4 w-4" />
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
        ? "inline-flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-left text-sm font-semibold leading-snug text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0"
        : "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"
      }>
        <span className={mobile ? "min-w-0 break-words" : undefined}>
          {preference.boardTitle} {preference.qualTitle && `• ${preference.qualTitle}`}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={mobile ? "start" : "end"} className="w-56 max-w-[calc(100vw-2rem)]">
        <DropdownMenuItem 
          className="cursor-pointer flex items-center"
          onClick={() => router.push(`/resources/${preference.board}`)}
        >
          <BookOpen className="h-4 w-4 mr-2" /> Change Qualification
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center"
          onClick={async () => {
            await clearEcosystemPreference();
            window.location.href = '/resources';
          }}
        >
          <Repeat className="h-4 w-4 mr-2" /> Switch Ecosystem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function NavbarClient({ preference }: { preference: EcosystemPreference | null }) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const routes = [
    { label: status === 'authenticated' ? 'Dashboard' : 'Home', href: status === 'authenticated' ? '/dashboard' : '/' },
    { label: 'Courses', href: '/courses' },
  ];
  
  if (preference) {
    routes.push({ label: 'Resources', href: '/resources' });
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto flex h-16 max-w-7xl min-w-0 items-center justify-between px-3 sm:px-4 lg:px-8">
        
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg transition-transform hover:scale-105">
          <div className="rounded-xl bg-primary/10 p-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Vexa
          </span>
        </Link>
        
        {/* Mobile Nav */}
        <div className="flex shrink-0 items-center gap-1 xl:hidden">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger className="flex size-10 items-center justify-center rounded-md transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-[390px]:size-11">
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[calc(100vw-1rem)] max-w-sm overflow-y-auto p-5 sm:w-full"
            >
              <SheetTitle className="flex items-center gap-2 pr-10 text-lg font-semibold">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  Vexa
              </SheetTitle>
              <SheetDescription className="sr-only">
                Vexa navigation, search, account, and academic ecosystem controls.
              </SheetDescription>

              <nav className="mt-2 flex flex-col gap-2 text-base font-medium">
                {preference && (
                  <div className="mb-2 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current ecosystem</p>
                    <EcosystemSwitcher preference={preference} mobile />
                  </div>
                )}

                <GlobalSearch
                  className="mb-2 h-11 w-full md:w-full lg:w-full"
                  onOpen={() => setMobileOpen(false)}
                />

                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="flex min-h-11 items-center rounded-lg px-3 transition-colors hover:bg-accent hover:text-primary"
                    onClick={() => setMobileOpen(false)}
                  >
                    {route.label}
                  </Link>
                ))}
                
                {status === 'authenticated' ? (
                  <>
                    <div className="my-2 h-px bg-border" />
                    <Link href="/dashboard" className="flex min-h-11 items-center gap-2 rounded-lg px-3 transition-colors hover:bg-accent hover:text-primary" onClick={() => setMobileOpen(false)}><BookOpen className="w-4 h-4" /> Dashboard</Link>
                    <Button variant="ghost" className="min-h-11 justify-start px-3 hover:text-primary" onClick={() => { setMobileOpen(false); signOut(); }}>
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login" className="mt-3 w-full" onClick={() => setMobileOpen(false)}>
                    <Button className="h-11 w-full">Login</Button>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center space-x-6 text-sm font-medium xl:flex">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {route.label}
            </Link>
          ))}
          
          <div className="h-4 w-px bg-border mx-2"></div>

          {preference && <EcosystemSwitcher preference={preference} />}

          <GlobalSearch />
          <ThemeToggle />

          {status === 'authenticated' ? (
            <UserDropdown session={session} />
          ) : (
            <Link href="/login">
              <Button variant="default" className="rounded-full px-6 transition-transform hover:scale-105 active:scale-95 shadow-md">
                Login
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
