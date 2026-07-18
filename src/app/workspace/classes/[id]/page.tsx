export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ClassDetailClient from "./ClassDetailClient";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as any;

  const workspace = await prisma.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) redirect("/dashboard");

  const cls = await prisma.class.findFirst({
    where: { id, workspaceId: workspace.id },
    include: {
      subject: true,
      qualification: true,
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: { select: { id: true, name: true, email: true, createdAt: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
    },
  });

  if (!cls) notFound();

  // Fetch assignments for these students
  const studentIds = cls.students.map(s => s.studentId);
  const assignments = await prisma.worksheetAssignment.findMany({
    where: { userId: { in: studentIds } },
    include: { worksheet: true }
  });

  // Deduplicate worksheet assignments to get unique assigned challenges for this class
  const uniqueAssignedChallenges = Array.from(new Map(assignments.map(a => [a.worksheetId, a.worksheet])).values());

  const availableChallenges = await prisma.challenge.findMany({
    where: { 
      workspaceId: workspace.id,
      OR: [
        { type: "WORKSHEET" },
        { type: "QUICK_PRACTICE" }
      ]
    },
    select: { id: true, title: true, type: true },
    orderBy: { createdAt: "desc" }
  });

  const unassignedChallenges = availableChallenges.filter(
    c => !uniqueAssignedChallenges.some(ac => ac.id === c.id)
  );

  return <ClassDetailClient 
    classData={cls} 
    unassignedChallenges={unassignedChallenges} 
    assignedChallenges={uniqueAssignedChallenges} 
  />;
}
