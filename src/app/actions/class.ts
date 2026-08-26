"use server";

import { randomInt } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace, requireAuth } from "@/lib/require-role";
import { syncLateJoinerAssignmentRecipients } from "@/lib/workspace-assignment-service";

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomCharacter = () => chars[randomInt(chars.length)];
  const seg1 = Array.from({ length: 4 }, randomCharacter).join("");
  const seg2 = Array.from({ length: 2 }, randomCharacter).join("");
  return `VX-${seg1}-${seg2}`;
}

async function uniqueJoinCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    const exists = await prisma.class.findUnique({ where: { joinCode: code } });
    if (!exists) return code;
  }
  throw new Error("Failed to generate unique join code");
}

// === TEACHER ACTIONS ===

export async function createClass(data: {
  name: string;
  subjectId?: string | null;
  qualificationId?: string | null;
  academicYear: string;
  maxStudents?: number | null;
}) {
  const user = await requireActiveWorkspace();
  const joinCode = await uniqueJoinCode();
  const cls = await prisma.class.create({
    data: {
      name: data.name,
      workspaceId: user.workspaceId,
      subjectId: data.subjectId || null,
      qualificationId: data.qualificationId || null,
      academicYear: data.academicYear,
      joinCode,
      maxStudents: data.maxStudents || null,
    },
  });
  revalidatePath("/workspace/classes");
  return cls;
}

export async function updateClass(classId: string, data: {
  name?: string;
  subjectId?: string | null;
  qualificationId?: string | null;
  academicYear?: string;
  maxStudents?: number | null;
  status?: string;
}) {
  const user = await requireActiveWorkspace();
  const cls = await prisma.class.findFirst({
    where: { id: classId, workspaceId: user.workspaceId },
  });
  if (!cls) throw new Error("Class not found in your workspace");
  const updated = await prisma.class.update({ where: { id: classId }, data });
  revalidatePath("/workspace/classes");
  revalidatePath(`/workspace/classes/${classId}`);
  return updated;
}

export async function archiveClass(classId: string) {
  return updateClass(classId, { status: "ARCHIVED" });
}

export async function regenerateJoinCode(classId: string) {
  const user = await requireActiveWorkspace();
  const cls = await prisma.class.findFirst({
    where: { id: classId, workspaceId: user.workspaceId },
  });
  if (!cls) throw new Error("Class not found in your workspace");
  const newCode = await uniqueJoinCode();
  const updated = await prisma.class.update({
    where: { id: classId },
    data: { joinCode: newCode },
  });
  revalidatePath(`/workspace/classes/${classId}`);
  return updated;
}

export async function getClassWithStudents(classId: string) {
  const user = await requireActiveWorkspace();
  const cls = await prisma.class.findFirst({
    where: { id: classId, workspaceId: user.workspaceId },
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
  if (!cls) throw new Error("Class not found in your workspace");
  return cls;
}

export async function addStudentToClass(classId: string, studentEmail: string) {
  const user = await requireActiveWorkspace();
  const enrollment = await prisma.$transaction(async (tx) => {
    const cls = await tx.class.findFirst({
      where: {
        id: classId,
        workspaceId: user.workspaceId,
        status: "ACTIVE",
        workspace: { status: "ACTIVE" },
      },
      include: { _count: { select: { students: { where: { status: "ACTIVE" } } } } },
    });
    if (!cls) throw new Error("Active class not found in your workspace");

    const student = await tx.user.findUnique({ where: { email: studentEmail.trim() } });
    if (!student) throw new Error("No student found with that email");
    if (student.role !== "STUDENT") throw new Error("Only student accounts can be added to a class");

    const existing = await tx.classStudent.findUnique({
      where: { classId_studentId: { classId, studentId: student.id } },
    });
    if (!existing || existing.status !== "ACTIVE") {
      if (cls.maxStudents && cls._count.students >= cls.maxStudents) throw new Error("Class is full");
    }

    const nextEnrollment = await tx.classStudent.upsert({
      where: { classId_studentId: { classId, studentId: student.id } },
      create: { classId, studentId: student.id },
      update: { status: "ACTIVE" },
    });

    await syncLateJoinerAssignmentRecipients(tx, classId, student.id);

    if (!student.workspaceId) {
      await tx.user.update({
        where: { id: student.id },
        data: { workspaceId: user.workspaceId },
      });
    }
    return nextEnrollment;
  }, { isolationLevel: "Serializable" });

  revalidatePath(`/workspace/classes/${classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
  return enrollment;
}

export async function removeStudentFromClass(classId: string, studentId: string) {
  const user = await requireActiveWorkspace();
  const cls = await prisma.class.findFirst({
    where: { id: classId, workspaceId: user.workspaceId },
  });
  if (!cls) throw new Error("Class not found in your workspace");
  await prisma.classStudent.updateMany({
    where: { classId, studentId },
    data: { status: "REMOVED" },
  });
  revalidatePath(`/workspace/classes/${classId}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
}

// === STUDENT ACTIONS ===

export type JoinClassByCodeResult =
  | { success: true; className: string; workspaceName: string }
  | { success: false; error: string };

export async function joinClassByCode(joinCode: string): Promise<JoinClassByCodeResult> {
  const user = await requireAuth();
  if (user.role !== "STUDENT") {
    return { success: false, error: "Only student accounts can join a class." };
  }
  const normalizedCode = joinCode.trim().toUpperCase();

  const joined = await prisma.$transaction(async (tx) => {
    const cls = await tx.class.findUnique({
      where: { joinCode: normalizedCode },
      include: {
        workspace: { select: { id: true, name: true, status: true } },
      },
    });

    if (!cls) throw new Error("Invalid join code");
    if (cls.status !== "ACTIVE") throw new Error("This class is no longer active");
    if (!cls.joinCodeActive) throw new Error("Join code is disabled for this class");
    if (cls.workspace.status !== "ACTIVE") throw new Error("This workspace is not active");

    const existing = await tx.classStudent.findUnique({
      where: { classId_studentId: { classId: cls.id, studentId: user.id } },
    });
    if (existing?.status === "ACTIVE") {
      throw new Error("You are already enrolled in this class");
    }

    const activeStudents = await tx.classStudent.count({
      where: { classId: cls.id, status: "ACTIVE" },
    });
    if (cls.maxStudents && activeStudents >= cls.maxStudents) {
      throw new Error("This class is full");
    }

    await tx.classStudent.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: user.id } },
      create: { classId: cls.id, studentId: user.id },
      update: { status: "ACTIVE" },
    });

    await syncLateJoinerAssignmentRecipients(tx, cls.id, user.id);

    // Retained for legacy UI/session compatibility only. Authorization must use
    // ClassStudent membership and exact assignments, never this pointer.
    await tx.user.update({
      where: { id: user.id },
      data: { workspaceId: cls.workspace.id },
    });

    return { className: cls.name, workspaceName: cls.workspace.name };
  }, { isolationLevel: "Serializable" });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
  return { success: true, ...joined };
}

export async function getMyClasses() {
  const user = await requireAuth();
  return prisma.classStudent.findMany({
    where: { studentId: user.id, status: "ACTIVE" },
    include: {
      class: {
        include: {
          workspace: { select: { name: true } },
          subject: { select: { name: true } },
          qualification: { select: { title: true } },
          _count: { select: { students: { where: { status: "ACTIVE" } } } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });
}

export async function leaveClass(classId: string) {
  const user = await requireAuth();
  await prisma.classStudent.updateMany({
    where: { classId, studentId: user.id },
    data: { status: "REMOVED" },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
}
