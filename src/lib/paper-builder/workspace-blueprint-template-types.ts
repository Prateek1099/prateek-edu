import type {
  BlueprintTemplateSnapshot,
  BlueprintTemplateSummary,
  CreateBlueprintTemplateInput,
} from "./blueprint-template-types";

export type WorkspaceBlueprintTemplateStatus = "active" | "archived";

export type WorkspaceBlueprintTemplateInput = CreateBlueprintTemplateInput & {
  preferredHeaderTemplateId?: string | null;
};

export type WorkspaceBlueprintTemplateSummary = BlueprintTemplateSummary & {
  preferredHeaderTemplateId: string | null;
  preferredHeaderTemplateName: string | null;
  subjectName: string;
  boardTitle: string;
  qualificationTitle: string;
  chapterCount: number;
  rowCount: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  staleReason: string | null;
};

export type WorkspaceBlueprintTemplateSnapshot = WorkspaceBlueprintTemplateSummary & {
  headerDefaults: BlueprintTemplateSnapshot["headerDefaults"];
  chapters: BlueprintTemplateSnapshot["chapters"];
  applyWarnings?: string[];
};

export type ManagedWorkspaceBlueprintTemplate = WorkspaceBlueprintTemplateSummary & {
  chapters: WorkspaceBlueprintTemplateSnapshot["chapters"];
};

export type WorkspaceBlueprintTemplateListResult =
  | { success: true; templates: WorkspaceBlueprintTemplateSummary[] }
  | { success: false; error: string };

export type WorkspaceBlueprintTemplateApplyResult =
  | { success: true; template: WorkspaceBlueprintTemplateSnapshot }
  | { success: false; error: string };

export type WorkspaceBlueprintTemplateMutationResult =
  | { success: true; template?: WorkspaceBlueprintTemplateSummary; message: string }
  | { success: false; error: string };

export type WorkspaceBlueprintTemplateCreateResult =
  | { success: true; template: WorkspaceBlueprintTemplateSummary; message: string }
  | { success: false; error: string };
