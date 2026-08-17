import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Calendar, CheckCircle2, Clock, ChevronLeft } from "lucide-react";

export default async function StudentWorksheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) redirect("/login");
  const userId = (session.user as typeof session.user & { id?: string }).id;
  if (!userId) redirect("/login");

  const assignments = await prisma.worksheetAssignment.findMany({
    where: {
      userId,
      worksheet: { isPublished: true },
    },
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
    <div className="relative container px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-8 min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div>
        <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5">
          <ChevronLeft className="size-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex items-start gap-3.5">
        <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm mt-0.5">
          <FileText className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Assigned Worksheets</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Open assigned worksheets, submit document practice, and track teacher deadlines.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-16 text-center">
            <FileText className="mx-auto size-10 text-muted-foreground opacity-50 mb-3" />
            <h3 className="text-base sm:text-lg font-bold">No assigned worksheets right now</h3>
            <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Worksheets and practice sets assigned by your teacher will appear here automatically.
            </p>
          </div>
        ) : (
          assignments.map(assignment => {
            const ws = assignment.worksheet;
            const isCompleted = assignment.status === "COMPLETED";
            const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate) && !isCompleted;

            const board = ws.subject.qualification.board.name;
            const qual = ws.subject.qualification.name;
            const worksheetLink = `/resources/${board}/${qual}/${ws.subject.slug}/worksheet/${ws.id}`;
            const attemptLink = `/resources/${board}/${qual}/${ws.subject.slug}/challenge/${ws.id}/attempt`;
            const isDocumentWorksheet = ws.type === "WORKSHEET" || ws.type === "PDF_WORKSHEET";

            return (
              <Card
                key={assignment.id}
                className={`rounded-2xl border bg-card shadow-sm transition-all hover:border-primary/40 ${
                  isOverdue ? "border-destructive/50" : "border-border/80"
                }`}
              >
                <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">{ws.title}</h3>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="size-3.5" /> Completed
                        </span>
                      ) : isOverdue ? (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive font-semibold">
                          <Clock className="size-3.5" /> Overdue
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-semibold">
                          Assigned
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                      {ws.subject.name} · {ws.type === "PDF_WORKSHEET"
                        ? "PDF assignment"
                        : `${ws._count.questions} Questions`} · {ws.difficulty.charAt(0).toUpperCase() + ws.difficulty.slice(1)}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" /> Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                      </span>
                      {assignment.dueDate && (
                        <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                          <Clock className="size-3.5" /> Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-auto shrink-0 flex flex-col sm:flex-row gap-2">
                    {isDocumentWorksheet ? (
                      <Link href={worksheetLink} className="block w-full sm:w-auto">
                        <Button className="w-full sm:w-auto gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm">
                          <FileText className="size-4" />
                          View Worksheet
                        </Button>
                      </Link>
                    ) : isCompleted ? (
                      <Button variant="outline" className="w-full sm:w-auto rounded-xl text-xs sm:text-sm font-semibold" disabled>Already Completed</Button>
                    ) : (
                      <Link href={attemptLink} className="block w-full sm:w-auto">
                        <Button className="w-full sm:w-auto rounded-xl text-xs sm:text-sm font-semibold shadow-sm">Start Practice</Button>
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
