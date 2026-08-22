import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PaperBuilderModeNav } from "@/components/paper-builder/PaperBuilderModeNav";
import { buttonVariants } from "@/components/ui/button";
import { calculateTemplateSnapshotMarks } from "@/lib/paper-builder/blueprint-template-rules";
import type { ManagedBlueprintTemplate } from "@/lib/paper-builder/blueprint-template-types";
import type { PaperDifficulty } from "@/lib/paper-builder/types";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

import TemplatesManagerClient from "./TemplatesManagerClient";

export const dynamic = "force-dynamic";

const difficultyFromDatabase: Record<string, PaperDifficulty> = {
  ANY: "any",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
};

export default async function BlueprintTemplatesPage() {
  await requireSuperAdmin();

  const [subjects, topics, records] = await Promise.all([
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
    prisma.paperBlueprintTemplate.findMany({
      include: {
        board: { select: { title: true } },
        qualification: { select: { id: true, boardId: true, title: true } },
        subject: { select: { id: true, qualificationId: true, name: true } },
        chapters: {
          include: {
            topic: { select: { id: true, subjectId: true, topicName: true } },
            rows: { orderBy: { sortOrder: "asc" } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    }),
  ]);

  const templates: ManagedBlueprintTemplate[] = records.map((record) => {
    const chapters = record.chapters.map((chapter) => ({
      topicId: chapter.topicId,
      topicName: chapter.topic.topicName,
      sortOrder: chapter.sortOrder,
      rows: chapter.rows.map((row) => ({
        sectionLabel: row.sectionLabel,
        questionType: row.questionType,
        questionCount: row.questionCount,
        marksPerQuestion: row.marksPerQuestion,
        difficulty: difficultyFromDatabase[row.difficulty] ?? "any",
        sortOrder: row.sortOrder,
      })),
    }));
    const staleReasons: string[] = [];
    if (record.qualification.boardId !== record.boardId || record.subject.qualificationId !== record.qualificationId) {
      staleReasons.push("The saved board, qualification, and subject relationship is no longer valid.");
    }
    if (record.chapters.some((chapter) => chapter.topic.subjectId !== record.subjectId)) {
      staleReasons.push("One or more saved chapters no longer belong to this subject.");
    }
    if (record.chapters.length === 0 || record.chapters.some((chapter) => chapter.rows.length === 0)) {
      staleReasons.push("The saved pattern has an empty chapter or no chapters.");
    }
    if (calculateTemplateSnapshotMarks(chapters) !== record.totalMarks) {
      staleReasons.push("The saved total no longer matches the pattern rows.");
    }
    if (record.includeHeaderDefaults && (!record.institutionName || !record.examLabel || !record.durationMinutes)) {
      staleReasons.push("The saved header defaults are incomplete.");
    }
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      boardId: record.boardId,
      qualificationId: record.qualificationId,
      subjectId: record.subjectId,
      totalMarks: record.totalMarks,
      includeHeaderDefaults: record.includeHeaderDefaults,
      boardTitle: record.board.title,
      qualificationTitle: record.qualification.title,
      subjectName: record.subject.name,
      chapterCount: record.chapters.length,
      rowCount: record.chapters.reduce((total, chapter) => total + chapter.rows.length, 0),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      staleReason: staleReasons.length ? staleReasons.join(" ") : null,
      headerDefaults: record.includeHeaderDefaults ? {
        institutionName: record.institutionName ?? "",
        examLabel: record.examLabel ?? "",
        title: record.title ?? "",
        courseLine: record.courseLine ?? "",
        topicLine: record.topicLine ?? "",
        durationMinutes: record.durationMinutes ?? 0,
        dateText: record.dateText ?? "",
        classText: record.classText ?? "",
        showStudentName: record.showStudentName ?? true,
        showRollNumber: record.showRollNumber ?? true,
        instructions: record.instructions ?? "",
      } : null,
      chapters,
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Blueprint Templates</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Manage reusable chapter and question-distribution patterns. Templates never contain selected Question Bank IDs or generated papers.
          </p>
        </div>
        <Link href="/admin/paper-builder/blueprint" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="size-4" /> Back to Blueprint Builder
        </Link>
      </header>

      <PaperBuilderModeNav mode="templates" />

      <TemplatesManagerClient
        templates={templates}
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
