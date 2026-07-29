import { AdminSidebar } from "@/components/AdminSidebar";
import { AdminBoardProvider } from "@/components/AdminBoardContext";
import { prisma } from "@/lib/prisma";
import { rejectIfNotAdmin } from "@/lib/require-role";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const denied = await rejectIfNotAdmin();
  if (denied) {
    redirect("/dashboard");
  }

  const dbBoards = await prisma.board.findMany({
    orderBy: { title: "asc" }
  });
  
  const boards = [
    { value: "all", label: "All Boards" },
    ...dbBoards.map(b => ({ value: b.name, label: b.title }))
  ];

  return (
    <AdminBoardProvider>
      <div className="flex min-h-screen bg-muted/40">
        <AdminSidebar boards={boards} />
        <main className="min-w-0 flex-1 overflow-x-auto p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </AdminBoardProvider>
  );
}
