import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorksheetBuilder } from "./WorksheetBuilder";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function WorksheetCreatePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    include: { topics: { orderBy: { sortOrder: 'asc' } } }
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/admin/worksheets" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Worksheets
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Worksheet</h1>
        <p className="text-muted-foreground mt-1">Configure and generate a new worksheet using existing questions or AI.</p>
      </div>

      <WorksheetBuilder subjects={subjects} />
    </div>
  );
}
