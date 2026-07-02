import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Calendar, CheckCircle2, Clock } from "lucide-react";

export default async function StudentWorksheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");

  const assignments = await prisma.worksheetAssignment.findMany({
    where: { userId: (session.user as any).id },
    include: {
      worksheet: {
        include: {
          subject: {
            include: { qualification: { include: { board: true } } }
          },
          _count: { select: { questions: true } }
        }
      }
    },
    orderBy: { assignedAt: "desc" }
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Worksheets</h1>
        <p className="text-muted-foreground mt-1">Complete your assigned worksheets to improve your weak areas.</p>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>You have no assigned worksheets right now.</p>
              <p className="text-sm mt-2">Worksheets assigned by your teacher will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map(assignment => {
            const ws = assignment.worksheet;
            const isCompleted = assignment.status === "COMPLETED";
            const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate) && !isCompleted;

            // Compute the attempt link. Since Worksheet is a Challenge, we use the challenge attempt route.
            const board = ws.subject.qualification.board.name;
            const qual = ws.subject.qualification.name;
            const attemptLink = `/resources/${board}/${qual}/${ws.subject.slug}/challenge/${ws.id}/attempt`;

            return (
              <Card key={assignment.id} className={`transition-colors ${isOverdue ? "border-destructive/50" : ""}`}>
                <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold">{ws.title}</h3>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : isOverdue ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                          <Clock className="w-3 h-3" /> Overdue
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-medium">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {ws.subject.name} • {ws._count.questions} Questions • {ws.difficulty.charAt(0).toUpperCase() + ws.difficulty.slice(1)}
                    </p>
                    <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </span>
                      {assignment.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto shrink-0 flex flex-col sm:flex-row gap-2">
                    {ws.type === "PDF_WORKSHEET" ? (
                      <>
                        {ws.pdfUrl && (
                          <a href={ws.pdfUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="default" className="w-full sm:w-auto gap-2">
                              <FileText className="w-4 h-4" /> View Questions
                            </Button>
                          </a>
                        )}
                        {ws.pdfAnswerUrl && (
                          <a href={ws.pdfAnswerUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" className="w-full sm:w-auto gap-2">
                              <FileText className="w-4 h-4" /> View Answers
                            </Button>
                          </a>
                        )}
                      </>
                    ) : isCompleted ? (
                      <Button variant="outline" className="w-full sm:w-auto" disabled>Already Completed</Button>
                    ) : (
                      <Link href={attemptLink} className="block">
                        <Button className="w-full sm:w-auto">Start Worksheet</Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
