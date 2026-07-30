import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorksheetBuilder } from "./WorksheetBuilder";
import { PdfWorksheetUploader } from "./PdfWorksheetUploader";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminRole } from "@/lib/roles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function WorksheetCreatePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !isAdminRole((session.user as { role?: string }).role)) redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    include: { topics: { orderBy: { sortOrder: 'asc' } } }
  });

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <Link href="/admin/worksheets" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Worksheets
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Create Worksheet</h1>
        <p className="text-muted-foreground mt-1">Generate a worksheet from the Question Bank / AI, or upload your own PDF.</p>
      </div>

      <Tabs defaultValue="bank" className="gap-5">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 p-1 sm:grid-cols-3">
          <TabsTrigger value="bank" className="min-h-10 px-3">Question Bank</TabsTrigger>
          <TabsTrigger value="ai" className="min-h-10 px-3">AI generation</TabsTrigger>
          <TabsTrigger value="pdf" className="min-h-10 px-3">Upload PDF</TabsTrigger>
        </TabsList>
        <TabsContent value="bank">
          <WorksheetBuilder subjects={subjects} source="bank" />
        </TabsContent>
        <TabsContent value="ai">
          <WorksheetBuilder subjects={subjects} source="ai" />
        </TabsContent>
        <TabsContent value="pdf">
          <PdfWorksheetUploader subjects={subjects} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
