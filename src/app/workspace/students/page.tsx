export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import StudentsClient from "./StudentsClient";
import { UserCircle } from "lucide-react";
import { requireActiveWorkspace } from "@/lib/require-role";
import { listActiveWorkspaceSubjectIds } from "@/lib/workspace-academic-scope";

type StudentSummary = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  averageScore: number | null;
  weakTopics: string[];
  enrolledAt: Date;
};

export default async function WorkspaceStudentsPage() {
  const user = await requireActiveWorkspace();
  const subjectIds = await listActiveWorkspaceSubjectIds(user.workspaceId);

  // Fetch all active students in the workspace's active classes
  const classStudents = await prisma.classStudent.findMany({
    where: { 
      class: { workspaceId: user.workspaceId, status: "ACTIVE", subjectId: { in: subjectIds } },
      status: "ACTIVE" 
    },
    include: {
      student: {
        include: {
          challengeAttempts: {
            where: { challenge: { workspaceId: user.workspaceId, subjectId: { in: subjectIds } } },
            select: { score: true, totalQuestions: true, percentage: true }
          },
          mistakeEntries: {
            where: { challenge: { workspaceId: user.workspaceId, subjectId: { in: subjectIds } } },
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
  const studentsMap = new Map<string, StudentSummary>();
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
    const s = studentsMap.get(cs.studentId)!;
    s.classes.push({ id: cs.class.id, name: cs.class.name });
    if (cs.class.subject) {
      if (!s.subjects.find((subject) => subject.id === cs.class.subject!.id)) {
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
          All students
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          A workspace-wide directory. Open a student from a class to keep their subject and assignment context clear.
        </p>
      </div>
      
      <StudentsClient initialStudents={students} />
    </div>
  );
}
