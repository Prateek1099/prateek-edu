import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, School, UserRound } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getStudentWorkspaceClasses } from "@/lib/student-workspace-classes";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function StudentClassesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { id?: string; role?: string };
  if (!user.id) redirect("/login");
  if (user.role !== "STUDENT") redirect(user.role === "TEACHER" ? "/workspace" : "/admin");

  const classes = await getStudentWorkspaceClasses(user.id);

  return (
    <main className="container mx-auto min-h-[calc(100vh-140px)] max-w-6xl space-y-7 px-4 py-7 sm:py-9 md:px-8">
      <Link
        href="/dashboard"
        className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Student home
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <School className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My classes</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Open your active classes and see work shared by each teacher.
            </p>
          </div>
        </div>
        <Link href="/dashboard/join" className={cn(buttonVariants({ variant: "outline" }), "w-full rounded-xl sm:w-auto")}>
          Join another class
        </Link>
      </header>

      {classes.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-14 text-center">
          <School className="mx-auto mb-3 size-10 text-muted-foreground/60" />
          <h2 className="text-lg font-semibold">You haven&apos;t joined a class yet.</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Ask your teacher for a class code, then join to see class-specific assignments here.
          </p>
          <Link href="/dashboard/join" className={cn(buttonVariants(), "mt-5 rounded-xl")}>Join class</Link>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {classes.map((studentClass) => {
            const teacherName = studentClass.workspace.owner.name
              || studentClass.workspace.owner.email
              || "Teacher";
            return (
              <Card key={studentClass.id} className="rounded-2xl border-border/80 bg-card shadow-sm transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {studentClass.subject?.name || "Class workspace"}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-lg font-semibold tracking-tight">{studentClass.name}</h2>
                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <p className="flex items-center gap-2"><School className="size-3.5 shrink-0" /> {studentClass.workspace.name}</p>
                      <p className="flex items-center gap-2"><UserRound className="size-3.5 shrink-0" /> {teacherName}</p>
                      <p className="flex items-center gap-2"><BookOpen className="size-3.5 shrink-0" /> {studentClass.qualification?.title || "Qualification not set"} · {studentClass.academicYear}</p>
                      <p className="flex items-center gap-2"><CalendarDays className="size-3.5 shrink-0" /> Joined {studentClass.enrolledAt.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-xs">
                    <span><strong className="text-primary">{studentClass.assignmentCounts.pending}</strong> to do</span>
                    <span className="text-muted-foreground"><strong className="text-foreground">{studentClass.assignmentCounts.completed}</strong> completed</span>
                    {studentClass.assignmentCounts.overdue > 0 ? <span className="font-semibold text-destructive">{studentClass.assignmentCounts.overdue} overdue</span> : null}
                  </div>

                  <Link href={`/dashboard/classes/${studentClass.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 min-h-10 w-full justify-between rounded-xl px-4")}>Open class <ArrowRight className="size-4" /></Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
    </main>
  );
}
