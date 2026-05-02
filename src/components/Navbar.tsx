import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function Navbar() {
  const routes = [
    { label: 'Home', href: '/' },
    { label: 'Past Papers', href: '/papers' },
    { label: 'Courses', href: '/courses' },
    { label: 'Topical Papers', href: '/topical' },
    { label: 'Syllabus', href: '/syllabus' },
    { label: 'Notes', href: '/notes' },
    { label: 'Progress Tracker', href: '/dashboard' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <div className="bg-primary/10 p-2 rounded-lg">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="font-bold sm:inline-block hidden text-xl tracking-tight text-foreground">
            ExamNest <span className="text-primary font-semibold text-sm ml-1 hidden lg:inline">| Hub</span>
          </span>
        </Link>
        <div className="flex md:hidden">
          <Sheet>
            <SheetTrigger className="md:hidden p-2 rounded-md hover:bg-muted transition-colors">
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
                <Link href="/about" className="hover:text-primary transition-colors">About</Link>
                <Link href="/contact" className="hover:text-primary transition-colors">Contact</Link>
                <Link href="/login" className="w-full">
                  <Button className="w-full">Student Login</Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
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
          <Link href="/login" className="ml-4">
            <Button variant="default" className="rounded-full px-6">
              Student Login
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
