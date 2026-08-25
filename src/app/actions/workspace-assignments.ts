"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";

export async function assignWorksheetToClass(data: {
  classId: string;
  worksheetId: string;
  dueDate?: Date | null;
}) {
  const user = await requireActiveWorkspace();
  
  // Verify class belongs to workspace
  const classData = await prisma.class.findUnique({
    where: { id: data.classId },
    include: {
      students: {
        where: { status: "ACTIVE" }
      }
    }
  });

  if (!classData || classData.workspaceId !== user.workspaceId) {
    throw new Error("Class not found or unauthorized");
  }

  // Verify worksheet belongs to workspace
  const worksheet = await prisma.challenge.findUnique({
    where: { id: data.worksheetId }
  });

  if (!worksheet || worksheet.workspaceId !== user.workspaceId) {
    throw new Error("Worksheet not found or unauthorized");
  }

  // Find users who aren't already assigned
  const existingAssignments = await prisma.worksheetAssignment.findMany({
    where: {
      worksheetId: data.worksheetId,
      userId: { in: classData.students.map((membership) => membership.studentId) }
    }
  });

  const existingUserIds = new Set(existingAssignments.map((assignment) => assignment.userId));
  const newMembers = classData.students.filter(
    (membership) => !existingUserIds.has(membership.studentId),
  );

  if (newMembers.length > 0) {
    await prisma.worksheetAssignment.createMany({
      data: newMembers.map((membership) => ({
        userId: membership.studentId,
        worksheetId: data.worksheetId,
        dueDate: data.dueDate || null,
        status: "NOT_STARTED"
      }))
    });
  }

  revalidatePath(`/workspace/classes/${data.classId}`);
  revalidatePath("/workspace/worksheets");
  revalidatePath("/workspace/quick-practice");
  
  return { assignedCount: newMembers.length };
}

export async function removeAssignment(userId: string, worksheetId: string) {
  const user = await requireActiveWorkspace();
  
  const [worksheet, activeMembership] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id: worksheetId },
      select: { workspaceId: true },
    }),
    prisma.classStudent.findFirst({
      where: {
        studentId: userId,
        status: "ACTIVE",
        class: { workspaceId: user.workspaceId, status: "ACTIVE" },
      },
      select: { id: true },
    }),
  ]);

  if (!worksheet || worksheet.workspaceId !== user.workspaceId) {
    throw new Error("Worksheet not found or unauthorized");
  }
  if (!activeMembership) {
    throw new Error("Student not found in an active class in your workspace");
  }

  await prisma.worksheetAssignment.deleteMany({
    where: {
      userId,
      worksheetId
    }
  });

  revalidatePath("/workspace/classes");
}
