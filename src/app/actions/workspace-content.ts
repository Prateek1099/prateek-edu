"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  listActiveWorkspaceSubjectIds,
  requireWorkspaceTopicScope,
} from "@/lib/workspace-academic-scope";

export async function createWorkspaceContent(data: {
  type: string;
  title: string;
  description?: string;
  pdfUrl?: string;
  subjectId?: string | null;
  topicId?: string | null;
  status?: string;
}) {
  const user = await requireActiveWorkspace();
  await requireWorkspaceTopicScope(user.workspaceId, data.subjectId, data.topicId);
  const content = await prisma.workspaceContent.create({
    data: {
      workspaceId: user.workspaceId,
      type: data.type,
      title: data.title,
      description: data.description,
      pdfUrl: data.pdfUrl,
      subjectId: data.subjectId || null,
      topicId: data.topicId || null,
      status: data.status || "DRAFT",
    },
  });
  revalidatePath("/workspace/content");
  return content;
}

export async function updateWorkspaceContent(contentId: string, data: {
  title?: string;
  description?: string;
  pdfUrl?: string;
  subjectId?: string | null;
  topicId?: string | null;
  status?: string;
}) {
  const user = await requireActiveWorkspace();
  const content = await prisma.workspaceContent.findFirst({
    where: { id: contentId, workspaceId: user.workspaceId },
  });
  if (!content) throw new Error("Content not found in your workspace");
  const subjectId = data.subjectId === undefined ? content.subjectId : data.subjectId;
  const topicId = data.topicId === undefined ? content.topicId : data.topicId;
  await requireWorkspaceTopicScope(user.workspaceId, subjectId, topicId);
  const updated = await prisma.workspaceContent.update({ where: { id: contentId }, data });
  revalidatePath("/workspace/content");
  return updated;
}

export async function deleteWorkspaceContent(contentId: string) {
  const user = await requireActiveWorkspace();
  const content = await prisma.workspaceContent.findFirst({
    where: { id: contentId, workspaceId: user.workspaceId },
  });
  if (!content) throw new Error("Content not found in your workspace");
  await prisma.workspaceContent.delete({ where: { id: contentId } });
  revalidatePath("/workspace/content");
}

export async function listWorkspaceContent(filters?: { type?: string; status?: string }) {
  const user = await requireActiveWorkspace();
  const subjectIds = await listActiveWorkspaceSubjectIds(user.workspaceId);
  const where: Record<string, unknown> = {
    workspaceId: user.workspaceId,
    subjectId: { in: subjectIds },
  };
  if (filters?.type && filters.type !== "all") where.type = filters.type;
  if (filters?.status && filters.status !== "all") where.status = filters.status;
  return prisma.workspaceContent.findMany({
    where,
    include: {
      subject: { select: { name: true } },
      topic: { select: { topicName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
