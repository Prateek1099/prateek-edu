"use client";

import BlueprintBuilderClient, {
  type BlueprintBuilderActions,
  type BlueprintBuilderConfig,
  type BlueprintBuilderDataProps,
} from "@/components/paper-builder/BlueprintBuilderClient";
import {
  generateTeacherBlueprintPaper,
  getTeacherBlueprintReplacementCandidates,
  regenerateTeacherBlueprintRow,
  regenerateTeacherBlueprintTopic,
  replaceTeacherBlueprintQuestion,
  reviewTeacherBlueprintAvailability,
  saveTeacherBlueprintGeneratedPaper,
  validateTeacherBlueprintSelection,
} from "@/lib/paper-builder/teacher-blueprint-actions";
import {
  applyTeacherBlueprintTemplate,
  createTeacherBlueprintTemplate,
  updateTeacherBlueprintTemplate,
} from "./templates/actions";

export const teacherBlueprintBuilderActions: BlueprintBuilderActions = {
  reviewAvailability: reviewTeacherBlueprintAvailability,
  generatePaper: generateTeacherBlueprintPaper,
  getReplacementCandidates: getTeacherBlueprintReplacementCandidates,
  selectCandidate: replaceTeacherBlueprintQuestion,
  regenerateRow: regenerateTeacherBlueprintRow,
  regenerateChapter: regenerateTeacherBlueprintTopic,
  validateSelection: validateTeacherBlueprintSelection,
  saveGeneratedPaper: saveTeacherBlueprintGeneratedPaper,
  createTemplate: createTeacherBlueprintTemplate,
  applyTemplate: applyTeacherBlueprintTemplate,
  updateTemplate: updateTeacherBlueprintTemplate,
};

export const teacherBlueprintBuilderConfig: BlueprintBuilderConfig = {
  teacherFacing: true,
  capabilities: {
    templates: true,
    archive: true,
    replacement: true,
    rowRegeneration: true,
    chapterRegeneration: true,
  },
  routes: {
    templateManagementHref: "/workspace/paper-builder/blueprint/templates",
    archivePaperHref: (paperId) => `/workspace/paper-builder/archive/${paperId}`,
  },
  copy: {
    questionBankLabel: "Vexa library and your questions",
    archiveLabel: "Saved papers",
    templateManagementLabel: "Manage saved chapter patterns",
    availabilitySuccess: "Question availability checked for every chapter and section.",
    generationSuccess: "Questions chosen. Review each chapter before previewing the paper.",
    savedPaperSuccess: "Paper saved to Saved papers.",
    summaryDescription: "Use your assigned subjects to plan the paper chapter by chapter.",
  },
  templateHeaderBehavior: "workspace_preference",
  reviewTools: {
    confirmRegeneration: true,
    showAlternativeWarnings: true,
    showModifiedStatus: true,
    replacementButtonLabel: "Choose different question",
    chapterRegenerationLabel: "Choose different questions for this chapter",
    chapterRegenerationSuccess: "Different questions chosen for this chapter. Every other chapter was preserved.",
  },
};

export default function TeacherBlueprintBuilderClient(props: BlueprintBuilderDataProps) {
  return (
    <BlueprintBuilderClient
      {...props}
      actions={teacherBlueprintBuilderActions}
      config={teacherBlueprintBuilderConfig}
    />
  );
}
