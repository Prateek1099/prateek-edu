export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import StudentsClient from "./StudentsClient";
import { UserCircle } from "lucide-react";

export default async function WorkspaceStudentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
  });

  if (!workspace) redirect("/dashboard");

  // Fetch all active students in the workspace's active classes
  const classStudents = await prisma.classStudent.findMany({
    where: { 
      class: { workspaceId: workspace.id, status: "ACTIVE" }, 
      status: "ACTIVE" 
    },
    include: {
      student: {
        include: {
          challengeAttempts: {
            where: { challenge: { subject: { classes: { some: { workspaceId: workspace.id } } } } },
            select: { score: true, totalQuestions: true, percentage: true }
          },
          mistakeEntries: {
            where: { challenge: { subject: { classes: { some: { workspaceId: workspace.id } } } } },
            select: { topicTag: true, mistakeCount: true }
          }
        }
      },
      class: {
        include: { subject: true }
      }
    }
  });

  // Group by student
  const studentsMap = new Map();
  classStudents.forEach(cs => {
    if (!studentsMap.has(cs.studentId)) {
      const attempts = cs.student.challengeAttempts;
      const mistakes = cs.student.mistakeEntries;
      
      const avgScore = attempts.length > 0 
        ? Math.round(attempts.reduce((acc, curr) => acc + curr.percentage, 0) / attempts.length)
        : null;

      // Calculate weakest topics based on mistakeCount
      const topicCounts: Record<string, number> = {};
      mistakes.forEach(m => {
        if (m.topicTag) {
          topicCounts[m.topicTag] = (topicCounts[m.topicTag] || 0) + m.mistakeCount;
        }
      });
      const weakTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic);

      studentsMap.set(cs.studentId, {
        id: cs.student.id,
        name: cs.student.name || "Unknown Student",
        email: cs.student.email,
        image: cs.student.image,
        classes: [],
        subjects: [],
        averageScore: avgScore,
        weakTopics: weakTopics,
        enrolledAt: cs.enrolledAt
      });
    }
    const s = studentsMap.get(cs.studentId);
    s.classes.push({ id: cs.class.id, name: cs.class.name });
    if (cs.class.subject) {
      if (!s.subjects.find((sub: any) => sub.id === cs.class.subject!.id)) {
        s.subjects.push({ id: cs.class.subject.id, name: cs.class.subject.name });
      }
    }
  });

  const students = Array.from(studentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col justify-between items-start border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserCircle className="size-8 text-primary" />
          Students Directory
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Manage and monitor all students across your active classes.
        </p>
      </div>
      
      <StudentsClient initialStudents={students} />
    </div>
  );
}
