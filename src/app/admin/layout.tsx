import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/40">
      <AdminSidebar />
      <main className="min-w-0 flex-1 overflow-x-auto p-6 md:p-8 lg:p-10">{children}</main>
    </div>
  );
}
