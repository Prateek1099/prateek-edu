import Link from 'next/link';
import { GraduationCap, Mail, Globe, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="container max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-foreground">
                Vexa
              </span>
            </Link>
            <p className="text-sm max-w-sm">
              The modern, organized, and distraction-free learning ecosystem for serious students.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">Explore</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/resources" className="hover:text-primary transition-colors">Resources</Link></li>
              <li><Link href="/courses" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">Boards</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/resources/cambridge" className="hover:text-primary transition-colors">Cambridge</Link></li>
              <li><Link href="/resources/cbse" className="hover:text-primary transition-colors">CBSE</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground/80">
          <p>&copy; {new Date().getFullYear()} Vexa. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
