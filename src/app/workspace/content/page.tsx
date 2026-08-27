export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import WorkspaceContentClient from "./WorkspaceContentClient";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";
import { requireActiveWorkspace } from "@/lib/require-role";

export default async function WorkspaceContentPage() {
  const user = await requireActiveWorkspace();
  const scopes = await listActiveWorkspaceScopes(user.workspaceId);
  const subjectIds = scopes.map((scope) => scope.subjectId);

  const content = await prisma.workspaceContent.findMany({
    where: { workspaceId: user.workspaceId, subjectId: { in: subjectIds } },
    include: {
      subject: { select: { name: true } },
      topic: { select: { topicName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subjects = scopes.map((scope) => scope.subject);

  return (
    <div className="space-y-6">
      {scopes.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      ) : null}
      <WorkspaceContentClient content={content} subjects={subjects} />
    </div>
  );
}
