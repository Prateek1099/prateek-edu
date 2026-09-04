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
    availabilitySuccess: "Availability checked against your current academic scope and eligible Question Bank records.",
    generationSuccess: "Complete paper generated. Review the topic allocations before previewing.",
    savedPaperSuccess: "Paper saved to Saved papers.",
    summaryDescription: "Build from your assigned subjects using the Vexa library and eligible MCQs added by your workspace. Saving keeps a private copy for your workspace.",
  },
  templateHeaderBehavior: "workspace_preference",
  reviewTools: {
    confirmRegeneration: true,
    showAlternativeWarnings: true,
    showModifiedStatus: true,
    replacementButtonLabel: "Replace Question",
    chapterRegenerationLabel: "Regenerate Topic",
    chapterRegenerationSuccess: "Topic regenerated. Every other topic was preserved.",
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
