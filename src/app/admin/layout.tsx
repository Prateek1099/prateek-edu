import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminBoardProvider } from "@/components/AdminBoardContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminBoardProvider>
      <div className="flex min-h-screen bg-muted/40">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-x-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </AdminBoardProvider>
  );
}
