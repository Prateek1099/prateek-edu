import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AdminWorksheetsClient from "./AdminWorksheetsClient";

export default async function AdminWorksheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const worksheets = await prisma.challenge.findMany({
    where: { type: { in: ["WORKSHEET", "PDF_WORKSHEET"] } },
    orderBy: { createdAt: "desc" },
    include: {
      subject: { include: { qualification: { include: { board: true } } } },
      topic: true,
      _count: { select: { questions: true, assignments: true } }
    }
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Worksheets</h1>
          <p className="text-muted-foreground mt-1">Generate and assign intelligent practice worksheets.</p>
        </div>
        <Link href="/admin/worksheets/create">
          <Button className="gap-2"><Plus className="w-4 h-4" /> Create Worksheet</Button>
        </Link>
      </div>

      <AdminWorksheetsClient worksheets={worksheets} />
    </div>
  );
}
