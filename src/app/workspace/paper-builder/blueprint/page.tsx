import {
  PaperBuilderModeNav,
  WORKSPACE_PAPER_BUILDER_NAV_ITEMS,
} from "@/components/paper-builder/PaperBuilderModeNav";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

import TeacherBlueprintBuilderClient from "./BlueprintBuilderClient";

export const dynamic = "force-dynamic";

export default async function TeacherBlueprintBuilderPage() {
  const teacher = await requireActiveWorkspace();
  const [scopes, headerTemplates] = await Promise.all([
    listActiveWorkspaceScopes(teacher.workspaceId),
    prisma.workspacePaperHeaderTemplate.findMany({
      where: { workspaceId: teacher.workspaceId, archivedAt: null },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const subjectIds = scopes.map((scope) => scope.subjectId);
  const topics = subjectIds.length > 0
    ? await prisma.topic.findMany({
        where: {
          subjectId: { in: subjectIds },
          status: "PUBLISHED",
          subject: {
            status: "PUBLISHED",
            qualification: {
              status: "PUBLISHED",
              board: { status: "PUBLISHED" },
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
      })
    : [];

  const navigation = (
    <PaperBuilderModeNav
      mode="blueprint"
      items={WORKSPACE_PAPER_BUILDER_NAV_ITEMS}
      ariaLabel="Teacher Paper Builder navigation"
    />
  );

  if (scopes.length === 0) {
    return (
      <div className="paper-builder-page mx-auto max-w-7xl space-y-8">
        <header className="paper-builder-screen-only max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight">Blueprint Builder</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Build a paper from topic-wise marks and question distribution.
          </p>
        </header>
        {navigation}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      </div>
    );
  }

  return (
    <div className="paper-builder-page mx-auto max-w-7xl space-y-8">
      <header className="paper-builder-screen-only max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Blueprint Builder</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          Build a paper from topic-wise marks and question distribution. Generated papers can be saved to your Teacher Paper Archive.
        </p>
      </header>

      <div className="paper-builder-screen-only rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
        Generation uses your active academic scope. Global Vexa questions support all seven paper types; workspace-owned questions remain MCQ-only.
      </div>

      {navigation}

      <TeacherBlueprintBuilderClient
        blueprintTemplates={[]}
        headerTemplates={headerTemplates.map((template) => ({
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
        }))}
        subjects={scopes.map((scope) => ({
          id: scope.subject.id,
          name: scope.subject.name,
          code: scope.subject.code,
          boardId: scope.subject.qualification.board.id,
          boardName: scope.subject.qualification.board.name,
          boardTitle: scope.subject.qualification.board.title,
          qualificationId: scope.subject.qualification.id,
          qualificationName: scope.subject.qualification.name,
          qualificationTitle: scope.subject.qualification.title,
        }))}
        topics={topics.map((topic) => ({
          id: topic.id,
          subjectId: topic.subjectId,
          name: topic.topicName,
          sortOrder: topic.sortOrder,
        }))}
      />

      <p className="paper-builder-screen-only text-xs leading-5 text-muted-foreground">
        Blueprint patterns are not saved in this phase. Saving a generated paper creates only a private immutable snapshot in your Teacher Paper Archive; it does not assign work to students.
      </p>
    </div>
  );
}
