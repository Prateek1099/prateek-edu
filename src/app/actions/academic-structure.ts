"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { rejectIfNotAdmin } from "@/lib/require-role";
import { Prisma } from "@prisma/client";

// --- BOARDS ---

export async function createBoard(data: { name: string; title: string; status: string }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.board.create({ data });
  revalidatePath("/admin");
  revalidatePath("/admin/academic-structure/boards");
  return result;
}

export async function updateBoard(id: string, data: { name: string; title: string; status: string }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.board.update({ where: { id }, data });
  revalidatePath("/admin");
  revalidatePath("/admin/academic-structure/boards");
  return result;
}

// --- QUALIFICATIONS ---

export async function createQualification(data: { boardId: string; name: string; title: string; status: string; sortOrder: number }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.qualification.create({ data });
  revalidatePath("/admin/academic-structure/qualifications");
  return result;
}

export async function updateQualification(id: string, data: { name: string; title: string; status: string; sortOrder: number }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.qualification.update({ where: { id }, data });
  revalidatePath("/admin/academic-structure/qualifications");
  return result;
}

// --- SUBJECTS ---

export async function createSubject(data: {
  qualificationId: string;
  name: string;
  slug: string;
  code?: string | null;
  status: string;
  sortOrder: number;
  iconType?: string | null;
  iconValue?: string | null;
}) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.subject.create({ data });
  revalidatePath("/admin/academic-structure/subjects");
  return result;
}

export async function updateSubject(id: string, data: {
  name: string;
  slug: string;
  code?: string | null;
  status: string;
  sortOrder: number;
  iconType?: string | null;
  iconValue?: string | null;
}) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const result = await prisma.subject.update({ where: { id }, data });
  revalidatePath("/admin/academic-structure/subjects");
  return result;
}

export async function duplicateSubject(subjectId: string, newQualificationId: string, newName: string, newSlug: string, copyTopics: boolean) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const original = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: { topics: true },
  });

  if (!original) throw new Error("Original subject not found");

  const newSubject = await prisma.subject.create({
    data: {
      qualificationId: newQualificationId,
      name: newName,
      slug: newSlug,
      code: original.code,
      sortOrder: original.sortOrder,
      iconType: original.iconType,
      iconValue: original.iconValue,
      status: "DRAFT", // Duplicates always start as draft
    },
  });

  if (copyTopics && original.topics.length > 0) {
    await prisma.topic.createMany({
      data: original.topics.map((t) => ({
        subjectId: newSubject.id,
        topicName: t.topicName,
        sortOrder: t.sortOrder,
        description: t.description,
        status: "DRAFT",
      })),
    });
  }

  revalidatePath("/admin/academic-structure/subjects");
  return newSubject;
}

// --- TOPICS ---

function normalizeTopicImportCode(value?: string | null) {
  const code = value?.trim() || null;
  if (code && code.length > 64) throw new Error("Import code must be 64 characters or fewer.");
  return code;
}

async function ensureTopicImportCodeAvailable(subjectId: string, importCode: string | null, excludeId?: string) {
  if (!importCode) return;
  const duplicate = await prisma.topic.findFirst({
    where: { subjectId, importCode, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new Error(`Import code “${importCode}” is already used by another topic in this subject.`);
}

export async function createTopic(data: { subjectId: string; topicName: string; importCode?: string | null; sortOrder: number; description?: string; status: string }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const importCode = normalizeTopicImportCode(data.importCode);
  await ensureTopicImportCodeAvailable(data.subjectId, importCode);
  let result;
  try {
    result = await prisma.topic.create({ data: { ...data, importCode } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Import code “${importCode}” is already used by another topic in this subject.`);
    }
    throw error;
  }
  revalidatePath("/admin/academic-structure/topics");
  return result;
}

export async function updateTopic(id: string, data: { topicName: string; importCode?: string | null; sortOrder: number; description?: string; status: string }) {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const existing = await prisma.topic.findUnique({ where: { id }, select: { subjectId: true } });
  if (!existing) throw new Error("Topic not found.");
  const importCode = normalizeTopicImportCode(data.importCode);
  await ensureTopicImportCodeAvailable(existing.subjectId, importCode, id);
  let result;
  try {
    result = await prisma.topic.update({ where: { id }, data: { ...data, importCode } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error(`Import code “${importCode}” is already used by another topic in this subject.`);
    }
    throw error;
  }
  revalidatePath("/admin/academic-structure/topics");
  return result;
}

export async function bulkImportTopics(subjectId: string, topicsText: string, status: string = "DRAFT") {
  const forbidden = await rejectIfNotAdmin();
  if (forbidden) throw new Error(forbidden);
  const lines = topicsText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length === 0) return { count: 0 };

  const existingTopics = await prisma.topic.findMany({
    where: { subjectId },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });
  
  let currentSortOrder = existingTopics.length > 0 ? existingTopics[0].sortOrder + 10 : 10;

  const dataToInsert = lines.map((topicName) => {
    const entry = {
      subjectId,
      topicName,
      sortOrder: currentSortOrder,
      status,
    };
    currentSortOrder += 10;
    return entry;
  });

  const result = await prisma.topic.createMany({ data: dataToInsert });
  revalidatePath("/admin/academic-structure/topics");
  return result;
}
