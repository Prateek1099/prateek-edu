"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireActiveWorkspace, requireAuth } from "@/lib/require-role";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// === SUPER ADMIN ACTIONS ===

export async function listWorkspaces(statusFilter?: string) {
  await requireSuperAdmin();
  const where = statusFilter && statusFilter !== "all" ? { status: statusFilter } : {};
  return prisma.workspace.findMany({
    where,
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { classes: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function approveWorkspace(workspaceId: string) {
  await requireSuperAdmin();
  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/admin/workspaces");
  return ws;
}

export async function suspendWorkspace(workspaceId: string) {
  await requireSuperAdmin();
  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status: "SUSPENDED" },
  });
  revalidatePath("/admin/workspaces");
  return ws;
}

export async function reactivateWorkspace(workspaceId: string) {
  await requireSuperAdmin();
  const ws = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { status: "ACTIVE" },
  });
  revalidatePath("/admin/workspaces");
  return ws;
}

export async function getWorkspaceDetail(workspaceId: string) {
  await requireSuperAdmin();
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      owner: { select: { id: true, name: true, email: true, createdAt: true } },
      classes: {
        include: {
          subject: true,
          qualification: true,
          _count: { select: { students: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      content: { orderBy: { createdAt: "desc" }, take: 20 },
      _count: { select: { classes: true, members: true, content: true } },
    },
  });
}

export async function deleteWorkspace(workspaceId: string) {
  const admin = await requireSuperAdmin();
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, ownerId: true, owner: { select: { email: true } } }
  });
  
  if (!workspace) throw new Error("Workspace not found");

  await prisma.$transaction(async (tx) => {
    // Deleting the owner (User) cascades to Workspace, Classes, ClassStudents, WorkspaceContent
    await tx.user.delete({ where: { id: workspace.ownerId } });
  });

  console.log(`[AUDIT LOG] Workspace Deleted - Name: ${workspace.name}, Teacher Email: ${workspace.owner.email}, Deleted By: ${admin.email}, Timestamp: ${new Date().toISOString()}`);

  revalidatePath("/admin/workspaces");
}

// === TEACHER ACTIONS ===

export async function getMyWorkspace() {
  const user = await requireAuth();
  return prisma.workspace.findUnique({
    where: { ownerId: user.id },
    include: {
      _count: { select: { classes: true, members: true, content: true } },
    },
  });
}

export async function updateMyWorkspace(data: { name?: string }) {
  const user = await requireActiveWorkspace();
  const updateData: Record<string, string> = {};
  if (data.name) {
    updateData.name = data.name;
    updateData.slug = slugify(data.name) + "-" + user.workspaceId.slice(-4);
  }
  const ws = await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: updateData,
  });
  revalidatePath("/workspace");
  revalidatePath("/workspace/settings");
  return ws;
}
