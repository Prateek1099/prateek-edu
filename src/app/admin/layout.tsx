import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  CreditCard,
  MessageSquare,
  LogOut,
  StickyNote,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-blue-600">Admin Panel</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/courses" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <BookOpen className="w-5 h-5" />
            Courses
          </Link>
          <Link href="/admin/papers" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <FileText className="w-5 h-5" />
            Papers
          </Link>
          <Link href="/admin/notes" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <StickyNote className="w-5 h-5" />
            Notes
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/admin/payments" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <CreditCard className="w-5 h-5" />
            Payments
          </Link>
          <Link href="/admin/queries" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
            <MessageSquare className="w-5 h-5" />
            Queries
          </Link>
        </nav>
        
        <div className="p-4 border-t">
          <Link href="/api/auth/signout" className="flex items-center gap-3 px-3 py-2 text-red-600 rounded-md hover:bg-red-50 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
