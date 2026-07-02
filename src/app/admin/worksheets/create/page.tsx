import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorksheetBuilder } from "./WorksheetBuilder";
import { PdfWorksheetUploader } from "./PdfWorksheetUploader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function WorksheetCreatePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    include: { topics: { orderBy: { sortOrder: 'asc' } } }
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <Link href="/admin/worksheets" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Worksheets
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Worksheet</h1>
        <p className="text-muted-foreground mt-1">Generate a worksheet from the Question Bank / AI, or upload your own PDF.</p>
      </div>

      <WorksheetBuilder subjects={subjects} />
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground font-semibold">Or upload a PDF</span>
        </div>
      </div>

      <PdfWorksheetUploader subjects={subjects} />
    </div>
  );
}
