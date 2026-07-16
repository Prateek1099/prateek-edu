export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminWorkspacesClient from "./AdminWorkspacesClient";

export default async function AdminWorkspacesPage() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      owner: { select: { id: true, name: true, email: true } },
      _count: { select: { classes: true, members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <AdminWorkspacesClient workspaces={workspaces} />;
}
