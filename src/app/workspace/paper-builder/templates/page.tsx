import { prisma } from "@/lib/prisma";
import { listManagedWorkspacePaperTemplates } from "@/lib/paper-builder/workspace-paper-template-data";
import { requireActiveWorkspace } from "@/lib/require-role";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

import TemplatesManagerClient from "./TemplatesManagerClient";

export const dynamic = "force-dynamic";

export default async function WorkspacePaperTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const teacher = await requireActiveWorkspace();
  const query = await searchParams;
  const status = query.status === "archived" ? "archived" : "active";
  const scopes = await listActiveWorkspaceScopes(teacher.workspaceId);
  const subjectIds = scopes.map((scope) => scope.subjectId);
  const [templates, topics, headerTemplates] = await Promise.all([
    listManagedWorkspacePaperTemplates(teacher.workspaceId, status),
    prisma.topic.findMany({
      where: { subjectId: { in: subjectIds } },
      select: { id: true, subjectId: true, topicName: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    }),
    prisma.workspacePaperHeaderTemplate.findMany({
      where: { workspaceId: teacher.workspaceId, archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Simple Paper Templates</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Manage reusable subject, topic, and section patterns for Teacher Paper Builder Standard.
          Templates never contain selected or generated questions.
        </p>
      </header>

      <TemplatesManagerClient
        status={status}
        templates={templates}
        subjects={scopes.map((scope) => ({
          id: scope.subject.id,
          label: `${scope.subject.name} · ${scope.subject.qualification.title} · ${scope.subject.qualification.board.title}`,
        }))}
        topics={topics.map((topic) => ({
          id: topic.id,
          subjectId: topic.subjectId,
          name: topic.topicName,
          sortOrder: topic.sortOrder,
        }))}
        headerTemplates={headerTemplates}
      />
    </div>
  );
}
