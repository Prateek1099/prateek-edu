import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Printer, Users } from "lucide-react";

export default async function AdminWorksheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || (session.user as any).role !== "admin") redirect("/dashboard");

  const worksheets = await prisma.challenge.findMany({
    where: { type: "WORKSHEET" },
    orderBy: { createdAt: "desc" },
    include: {
      subject: true,
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg text-primary"><FileText className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Generated</p>
                <h3 className="text-2xl font-bold">{worksheets.length}</h3>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Worksheets</CardTitle>
          <CardDescription>Manage your generated worksheets and assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {worksheets.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              No worksheets generated yet. Click 'Create Worksheet' to start.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Subject / Topic</th>
                    <th className="px-4 py-3">Questions</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {worksheets.map(ws => (
                    <tr key={ws.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">{ws.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {ws.subject.name} {ws.topic ? `• ${ws.topic.topicName}` : ''}
                      </td>
                      <td className="px-4 py-3">{ws._count.questions}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {ws._count.assignments} students</span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {/* Print PDF Button */}
                        <Link href={`/admin/worksheets/${ws.id}/print`}>
                          <Button variant="outline" size="sm" className="gap-2"><Printer className="w-3 h-3" /> Print PDF</Button>
                        </Link>
                        {/* Note: The user said we should have a 'Publish to Students' button. It could open a modal, but for now we just prepare the architecture. */}
                        <Button variant="secondary" size="sm">Publish</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
