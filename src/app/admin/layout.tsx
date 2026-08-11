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
      <div className="admin-shell min-h-screen bg-muted/40 lg:flex">
        <AdminSidebar boards={boards} />
        <main className="admin-content min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 md:py-8 lg:px-8 xl:px-10">
          <div className="admin-content-inner mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </AdminBoardProvider>
  );
}
