import {
  PaperBuilderModeNav,
  WORKSPACE_PAPER_BUILDER_NAV_ITEMS,
} from "@/components/paper-builder/PaperBuilderModeNav";
import { listManagedWorkspaceBlueprintTemplates } from "@/lib/paper-builder/workspace-blueprint-template-data";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

import BlueprintTemplatesManagerClient from "./BlueprintTemplatesManagerClient";

export const dynamic = "force-dynamic";

export default async function TeacherBlueprintTemplatesPage({
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
    listManagedWorkspaceBlueprintTemplates(teacher.workspaceId, status),
    prisma.topic.findMany({
      where: {
        subjectId: { in: subjectIds },
        status: "PUBLISHED",
        subject: {
          status: "PUBLISHED",
          qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
        },
      },
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
        <h1 className="text-3xl font-bold tracking-tight">Blueprint Templates</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Manage reusable topic-wise blueprint patterns for your assigned subjects. Templates store
          rules only—never selected or generated questions.
        </p>
      </header>

      <PaperBuilderModeNav
        mode="blueprint-templates"
        items={WORKSPACE_PAPER_BUILDER_NAV_ITEMS}
        ariaLabel="Teacher Paper Builder navigation"
      />

      <BlueprintTemplatesManagerClient
        status={status}
        templates={templates}
        subjects={scopes.map((scope) => ({
          id: scope.subject.id,
          name: scope.subject.name,
          label: `${scope.subject.name} · ${scope.subject.qualification.title} · ${scope.subject.qualification.board.title}`,
          boardId: scope.subject.qualification.board.id,
          boardTitle: scope.subject.qualification.board.title,
          qualificationId: scope.subject.qualification.id,
          qualificationTitle: scope.subject.qualification.title,
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
