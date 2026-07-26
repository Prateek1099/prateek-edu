import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminWorksheetsClient from "./AdminWorksheetsClient";
import { isAdminRole } from "@/lib/roles";

export default async function AdminWorksheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) redirect("/dashboard");

  const worksheets = await prisma.challenge.findMany({
    where: {
      type: { in: ["WORKSHEET", "PDF_WORKSHEET"] },
      workspaceId: null,
    },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { include: { qualification: { include: { board: true } } } },
      topic: true,
      _count: {
        select: {
          questions: true,
          assignments: true,
          attempts: true,
          mistakes: true,
        },
      },
    }
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worksheets</h1>
          <p className="mt-1 text-muted-foreground">
            Manage generated worksheets, PDF worksheets, and assignments.
          </p>
        </div>
        <Button
          className="w-full gap-2 sm:w-auto sm:shrink-0"
          nativeButton={false}
          render={<Link href="/admin/worksheets/create" />}
        >
          <Plus className="size-4" /> Create Worksheet
        </Button>
      </div>

      <AdminWorksheetsClient worksheets={worksheets} />
    </div>
  );
}
