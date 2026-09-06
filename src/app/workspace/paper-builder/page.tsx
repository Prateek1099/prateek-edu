import SimplePaperBuilderClient from "@/components/paper-builder/SimplePaperBuilderClient";
import {
  TeacherPapersEntry,
} from "@/components/paper-builder/PaperBuilderModeNav";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "@/lib/teacher-paper-builder-policy";
import {
  getWorkspacePaperTemplateSnapshot,
  listWorkspacePaperTemplateSummaries,
} from "@/lib/paper-builder/workspace-paper-template-data";
import type { WorkspacePaperTemplateSnapshot } from "@/lib/paper-builder/workspace-paper-template-types";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

import { validateTeacherPaperBuilderSelection } from "./actions";
import { saveTeacherGeneratedPaper } from "./archive/actions";
import {
  archiveWorkspacePaperHeaderTemplate,
  createWorkspacePaperHeaderTemplate,
  updateWorkspacePaperHeaderTemplate,
} from "./header-templates/actions";
import {
  applyWorkspacePaperTemplate,
  archiveWorkspacePaperTemplate,
  createWorkspacePaperTemplate,
  duplicateWorkspacePaperTemplate,
  updateWorkspacePaperTemplate,
} from "./templates/actions";

export const dynamic = "force-dynamic";

export default async function TeacherPaperBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  const user = await requireActiveWorkspace();
  const query = await searchParams;
  const requestedTemplateId =
    typeof query.template === "string" ? query.template : null;
  const [workspace, scopes, headerTemplates, paperTemplates] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: user.workspaceId },
      select: { name: true },
    }),
    listActiveWorkspaceScopes(user.workspaceId),
    prisma.workspacePaperHeaderTemplate.findMany({
      where: { workspaceId: user.workspaceId, archivedAt: null },
      orderBy: [{ name: "asc" }],
    }),
    listWorkspacePaperTemplateSummaries(user.workspaceId),
  ]);

  let initialPaperTemplate: WorkspacePaperTemplateSnapshot | null = null;
  let initialPaperTemplateError: string | null = null;
  if (requestedTemplateId) {
    try {
      initialPaperTemplate = await getWorkspacePaperTemplateSnapshot(
        user.workspaceId,
        requestedTemplateId,
      );
    } catch (error) {
      initialPaperTemplateError =
        error instanceof Error ? error.message : "Could not use the requested paper setup.";
    }
  }

  if (scopes.length === 0) {
    return (
      <div className="paper-builder-page mx-auto max-w-7xl space-y-8">
        <header>
          <p className="text-sm font-semibold text-primary">Teacher workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Papers</h1>
          <p className="mt-2 text-muted-foreground">
            Create a quick test or plan one chapter by chapter.
          </p>
        </header>
        <TeacherPapersEntry />
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      </div>
    );
  }

  const subjectIds = scopes.map((scope) => scope.subjectId);
  const [topics, questions] = await Promise.all([
    prisma.topic.findMany({
      where: { subjectId: { in: subjectIds } },
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    }),
    prisma.bankQuestion.findMany({
      where: {
        subjectId: { in: subjectIds },
        OR: [
          {
            workspaceId: null,
            questionType: { in: [...TEACHER_GLOBAL_PAPER_QUESTION_TYPES] },
          },
          {
            workspaceId: user.workspaceId,
            questionType: { in: [...TEACHER_WORKSPACE_PAPER_QUESTION_TYPES] },
          },
        ],
      },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        questionType: true,
        questionText: true,
        optionA: true,
        optionB: true,
        optionC: true,
        optionD: true,
        correctAnswer: true,
        modelAnswer: true,
        explanation: true,
        source: true,
        imageUrl: true,
        imageAlt: true,
        imageCaption: true,
        topicTag: true,
        difficulty: true,
        marks: true,
        topic: { select: { topicName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const subjects = scopes.map((scope) => scope.subject);

  return (
    <div className="paper-builder-page mx-auto max-w-7xl space-y-8">
      <header className="paper-builder-screen-only max-w-4xl">
        <p className="text-sm font-semibold text-primary">Teacher workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Papers</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
          Choose the paper-making approach that fits today’s assessment.
        </p>
      </header>

      <TeacherPapersEntry />

      <section id="quick-paper-builder" className="paper-builder-screen-only scroll-mt-6 border-t pt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Create</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Quick Paper</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Choose topics and marks. Vexa can help fill the questions. Saving the finished paper is optional.
        </p>
      </section>

      <SimplePaperBuilderClient
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
        headerTemplateActions={{
          create: createWorkspacePaperHeaderTemplate,
          update: updateWorkspacePaperHeaderTemplate,
          archive: archiveWorkspacePaperHeaderTemplate,
        }}
        headerTemplateManageHref="/workspace/paper-builder/header-templates"
        paperTemplates={paperTemplates}
        paperTemplateActions={{
          create: createWorkspacePaperTemplate,
          update: updateWorkspacePaperTemplate,
          apply: applyWorkspacePaperTemplate,
          duplicate: duplicateWorkspacePaperTemplate,
          archive: archiveWorkspacePaperTemplate,
        }}
        paperTemplateManageHref="/workspace/paper-builder/templates"
        initialPaperTemplate={initialPaperTemplate}
        initialPaperTemplateError={initialPaperTemplateError}
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
        questions={questions.map((question) => ({
          id: question.id,
          subjectId: question.subjectId,
          topicId: question.topicId,
          questionType: question.questionType,
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctAnswer: question.correctAnswer,
          modelAnswer: question.modelAnswer,
          explanation: question.explanation,
          source: question.source,
          imageUrl: question.imageUrl,
          imageAlt: question.imageAlt,
          imageCaption: question.imageCaption,
          topicTag: question.topicTag,
          difficulty: question.difficulty,
          marks: question.marks,
          topicName: question.topic?.topicName ?? null,
        }))}
        validateSelection={validateTeacherPaperBuilderSelection}
        allowedQuestionTypes={TEACHER_GLOBAL_PAPER_QUESTION_TYPES}
        initialSubjectId={subjects.length === 1 ? subjects[0].id : ""}
        defaultInstitutionName={workspace?.name || "VEXA"}
        academicScopeDescription="Choose one of your assigned subjects and the topics you want to assess."
        previewDescription="Your checked paper is ready to preview, print, download, or save."
        teacherFriendlyLabels
        savePaper={{
          action: saveTeacherGeneratedPaper,
          archiveHref: "/workspace/paper-builder/archive",
        }}
      />
    </div>
  );
}
