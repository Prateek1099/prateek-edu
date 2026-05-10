"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu, Search, User as UserIcon, BookOpen, Clock, Settings, LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ThemeToggle } from './ThemeToggle';
import { useSession, signOut } from 'next-auth/react';
// Removing unused dropdown menu imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useRef, useEffect } from "react";
import { GlobalSearch } from "./GlobalSearch";

function UserDropdown({ session }: { session: any }) {
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
          <Link 
            href="/dashboard/progress" 
            className="flex items-center w-full px-2 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Clock className="mr-2 h-4 w-4" />
            <span>My Progress</span>
          </Link>
          <div className="h-px bg-border my-1" />
          <Link 
            href="/settings" 
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

export default function Navbar() {
  const { data: session, status } = useSession();

  const routes = [
    { label: 'Home', href: '/' },
    { label: 'Courses', href: '/courses' },
    { label: 'Past Papers', href: '/board/cambridge/igcse' },
    { label: 'Resources', href: '/resources' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
          <div className="bg-primary/10 p-2 rounded-xl">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold sm:inline-block hidden text-xl tracking-tight text-foreground">
            ExamNest
          </span>
        </Link>
        
        {/* Mobile Nav */}
        <div className="flex md:hidden items-center gap-2">
          <GlobalSearch />
          <ThemeToggle />
          <Sheet>
            <SheetTrigger className="p-2 rounded-md hover:bg-muted transition-colors">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="grid gap-6 text-lg font-medium">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <GraduationCap className="h-6 w-6 text-primary" />
                  ExamNest
                </Link>
                {routes.map((route: any) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className="hover:text-primary transition-colors"
                  >
                    {route.label}
                  </Link>
                ))}
                
                {status === 'authenticated' ? (
                  <>
                    <div className="h-px bg-border my-2" />
                    <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-2"><BookOpen className="w-4 h-4" /> Dashboard</Link>
                    <Button variant="ghost" className="justify-start px-0 hover:bg-transparent hover:text-primary" onClick={() => signOut()}>
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                  </>
                ) : (
                  <Link href="/login" className="w-full mt-4">
                    <Button className="w-full">Student Login</Button>
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {routes.map((route: any) => (
            <Link
              key={route.href}
              href={route.href}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {route.label}
            </Link>
          ))}
          
          <div className="h-4 w-px bg-border mx-2"></div>

          <GlobalSearch />
          <ThemeToggle />

          {status === 'authenticated' ? (
            <UserDropdown session={session} />
          ) : (
            <Link href="/login">
              <Button variant="default" className="rounded-full px-6 transition-transform hover:scale-105 active:scale-95 shadow-md">
                Student Login
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
