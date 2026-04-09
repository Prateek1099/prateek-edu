import Link from 'next/link';
import { GraduationCap, Mail, Globe, Share2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-muted text-muted-foreground border-t">
      <div className="container max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg text-foreground">
                ExamNest
              </span>
            </Link>
            <p className="text-sm">
              Free, organized, ad-free past papers, topical questions, and study resources for serious students.
            </p>
            <div className="flex space-x-4">
              <Link href="#" className="hover:text-primary"><Globe className="h-4 w-4" /></Link>
              <Link href="#" className="hover:text-primary"><Share2 className="h-4 w-4" /></Link>
              <Link href="#" className="hover:text-primary"><Mail className="h-4 w-4" /></Link>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/papers" className="hover:text-primary">Past Papers</Link></li>
              <li><Link href="/topical" className="hover:text-primary">Topical Questions</Link></li>
              <li><Link href="/syllabus" className="hover:text-primary">Syllabus Checklists</Link></li>
              <li><Link href="/notes" className="hover:text-primary">Revision Notes</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Subjects</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/papers?subject=ict" className="hover:text-primary">IGCSE ICT (0417)</Link></li>
              <li><Link href="/papers?subject=cs" className="hover:text-primary">IGCSE Computer Science (0478)</Link></li>
              <li><Link href="/papers?subject=as-it" className="hover:text-primary">AS/A Level IT (9626)</Link></li>
              <li><Link href="/papers?subject=as-cs" className="hover:text-primary">AS/A Level CS (9618)</Link></li>
              <li><Link href="/papers?subject=cbse-ip" className="hover:text-primary">CBSE Informatics Practices</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">About</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-primary">About</Link></li>
              <li><Link href="/contact" className="hover:text-primary">Contact Me</Link></li>
              <li><Link href="/dashboard" className="hover:text-primary">Student Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between text-xs">
          <p>&copy; {new Date().getFullYear()} ExamNest. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link href="#" className="hover:text-primary">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
