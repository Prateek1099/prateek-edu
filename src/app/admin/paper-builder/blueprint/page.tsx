import { PaperBuilderModeNav } from "@/components/paper-builder/PaperBuilderModeNav";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

import BlueprintBuilderClient from "./BlueprintBuilderClient";

export const dynamic = "force-dynamic";

export default async function AdminBlueprintBuilderPage() {
  await requireSuperAdmin();

  const [subjects, topics, headerTemplates, blueprintTemplates] = await Promise.all([
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: [
        { qualification: { board: { title: "asc" } } },
        { qualification: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.topic.findMany({ orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }] }),
    prisma.paperHeaderTemplate.findMany({ orderBy: [{ name: "asc" }] }),
    prisma.paperBlueprintTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        boardId: true,
        qualificationId: true,
        subjectId: true,
        totalMarks: true,
        includeHeaderDefaults: true,
      },
      orderBy: [{ name: "asc" }],
    }),
  ]);

  return (
    <div className="paper-builder-page space-y-8">
      <header className="paper-builder-screen-only max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight">Blueprint Builder</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Control chapter-wise marks and question distribution, reuse saved blueprint patterns, then generate a printable paper from reviewed global Vexa Question Bank records. Generated papers remain browser-session-only.
        </p>
      </header>

      <PaperBuilderModeNav mode="blueprint" />

      <BlueprintBuilderClient
        blueprintTemplates={blueprintTemplates}
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
        subjects={subjects.map((subject) => ({
          id: subject.id,
          name: subject.name,
          code: subject.code,
          boardId: subject.qualification.board.id,
          boardName: subject.qualification.board.name,
          boardTitle: subject.qualification.board.title,
          qualificationId: subject.qualification.id,
          qualificationName: subject.qualification.name,
          qualificationTitle: subject.qualification.title,
        }))}
        topics={topics.map((topic) => ({
          id: topic.id,
          subjectId: topic.subjectId,
          name: topic.topicName,
          sortOrder: topic.sortOrder,
        }))}
      />
    </div>
  );
}
