"use client";

import BlueprintBuilderClient, {
  type BlueprintBuilderActions,
  type BlueprintBuilderConfig,
  type BlueprintBuilderDataProps,
} from "@/components/paper-builder/BlueprintBuilderClient";

import { saveGeneratedPaper } from "../archive/actions";
import {
  generateBlueprintPaper,
  getBlueprintReplacementCandidates,
  regenerateBlueprintChapter,
  regenerateBlueprintRow,
  reviewBlueprintAvailability,
  selectBlueprintCandidate,
  validateBlueprintSelection,
} from "./actions";
import {
  applyPaperBlueprintTemplate,
  createPaperBlueprintTemplate,
} from "./template-actions";

export const adminBlueprintBuilderActions: BlueprintBuilderActions = {
  reviewAvailability: reviewBlueprintAvailability,
  generatePaper: generateBlueprintPaper,
  getReplacementCandidates: getBlueprintReplacementCandidates,
  selectCandidate: selectBlueprintCandidate,
  regenerateRow: regenerateBlueprintRow,
  regenerateChapter: regenerateBlueprintChapter,
  validateSelection: validateBlueprintSelection,
  createTemplate: createPaperBlueprintTemplate,
  applyTemplate: applyPaperBlueprintTemplate,
  saveGeneratedPaper,
};

export const adminBlueprintBuilderConfig: BlueprintBuilderConfig = {
  capabilities: {
    templates: true,
    archive: true,
    replacement: true,
    rowRegeneration: true,
    chapterRegeneration: true,
  },
  routes: {
    templateManagementHref: "/admin/paper-builder/blueprint/templates",
    archivePaperHref: (paperId) => `/admin/paper-builder/archive/${paperId}`,
  },
  copy: {
    questionBankLabel: "global Question Bank",
    archiveLabel: "Paper Archive",
    templateManagementLabel: "Manage templates",
    availabilitySuccess: "Availability checked against the current global Question Bank.",
    generationSuccess: "Complete paper generated. Review the chapter allocations before previewing.",
    savedPaperSuccess: "Exact final paper saved to Paper Archive.",
    summaryDescription: "Saved templates contain only reusable patterns. A validated final paper is preserved only when you explicitly save it to Paper Archive.",
  },
};

export default function AdminBlueprintBuilderClient(props: BlueprintBuilderDataProps) {
  return (
    <BlueprintBuilderClient
      {...props}
      actions={adminBlueprintBuilderActions}
      config={adminBlueprintBuilderConfig}
    />
  );
}
