"use client";

import BlueprintBuilderClient, {
  type BlueprintBuilderActions,
  type BlueprintBuilderConfig,
  type BlueprintBuilderDataProps,
} from "@/components/paper-builder/BlueprintBuilderClient";
import {
  generateTeacherBlueprintPaper,
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
    replacement: false,
    rowRegeneration: false,
    chapterRegeneration: false,
  },
  routes: {
    templateManagementHref: "/workspace/paper-builder/blueprint/templates",
    archivePaperHref: (paperId) => `/workspace/paper-builder/archive/${paperId}`,
  },
  copy: {
    questionBankLabel: "assigned Vexa and workspace Question Banks",
    archiveLabel: "Teacher Paper Archive",
    templateManagementLabel: "Manage Blueprint Templates",
    availabilitySuccess: "Availability checked against your current academic scope and eligible Question Bank records.",
    generationSuccess: "Complete paper generated. Review the topic allocations before previewing.",
    savedPaperSuccess: "Exact final paper saved to Teacher Paper Archive.",
    summaryDescription: "Build from assigned subjects using published global Vexa questions and eligible MCQs owned by this workspace. Saving creates a private immutable paper only.",
  },
  templateHeaderBehavior: "workspace_preference",
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
