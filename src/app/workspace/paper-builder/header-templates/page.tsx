import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  PaperBuilderModeNav,
  WORKSPACE_PAPER_BUILDER_NAV_ITEMS,
} from "@/components/paper-builder/PaperBuilderModeNav";

import HeaderTemplatesManagerClient from "./HeaderTemplatesManagerClient";

export const dynamic = "force-dynamic";

export default async function WorkspacePaperHeaderTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
  const teacher = await requireActiveWorkspace();
  const query = await searchParams;
  const status = query.status === "archived" ? "archived" : "active";
  const records = await prisma.workspacePaperHeaderTemplate.findMany({
    where: {
      workspaceId: teacher.workspaceId,
      archivedAt: status === "archived" ? { not: null } : null,
    },
    orderBy: [{ name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-primary">Papers · Prepare</p>
        <h1 className="text-3xl font-bold tracking-tight">Paper headers</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Save school and exam details so you do not type them again.
        </p>
      </header>

      <PaperBuilderModeNav
        mode="header-templates"
        items={WORKSPACE_PAPER_BUILDER_NAV_ITEMS}
        ariaLabel="Teacher Paper Builder navigation"
      />

      <HeaderTemplatesManagerClient
        status={status}
        templates={records.map((template) => ({
          id: template.id,
          name: template.name,
          institutionName: template.institutionName,
          examLabel: template.examLabel,
          courseLine: template.courseLine,
          defaultDuration: template.defaultDuration,
          defaultInstructions: template.defaultInstructions,
          showStudentName: template.showStudentName,
          showRollNumber: template.showRollNumber,
          defaultClassLine: template.defaultClassLine,
          defaultTopicLine: template.defaultTopicLine,
          archivedAt: template.archivedAt?.toISOString() ?? null,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
