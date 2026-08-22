import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="container max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-4 sm:col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-foreground">
                Vexa
              </span>
            </Link>
            <p className="text-sm max-w-sm">
              Structured assessment preparation for teachers and focused learning resources for students. School access is currently available through managed demos and pilots.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">For Teachers</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/question-paper-generator" className="hover:text-primary transition-colors">Paper Generator</Link></li>
              <li><Link href="/teacher-question-bank" className="hover:text-primary transition-colors">Question Bank</Link></li>
              <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">Early Access</Link></li>
              <li><Link href="/request-demo" className="hover:text-primary transition-colors">Request Demo</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">For Students</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/resources" className="hover:text-primary transition-colors">Resources</Link></li>
              <li><Link href="/courses" className="hover:text-primary transition-colors">Courses</Link></li>
              <li><Link href="/syllabus" className="hover:text-primary transition-colors">Syllabus</Link></li>
              <li><Link href="/cbse-informatics-practices-question-bank" className="hover:text-primary transition-colors">Class 12 IP</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground tracking-tight">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground/80">
          <p>&copy; {new Date().getFullYear()} Vexa. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
