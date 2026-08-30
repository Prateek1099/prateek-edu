import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";

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
        <h1 className="text-3xl font-bold tracking-tight">Paper Header Templates</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Reuse school, exam, class, timing, and instruction defaults in Teacher Paper Builder. Templates never contain questions or marks.
        </p>
      </header>

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
