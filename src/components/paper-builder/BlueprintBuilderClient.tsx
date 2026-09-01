"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookTemplate,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileDown,
  FileCheck2,
  ImageIcon,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Settings2,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PaperAnswerKeyDocument, PaperQuestionDocument } from "@/components/paper-builder/PaperBuilderDocuments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BANK_QUESTION_TYPE_LABELS, type BankQuestionTypeValue } from "@/lib/bank-questions";
import {
  applyBlueprintCandidate,
  applyBlueprintRegeneratedRows,
  calculateBlueprintChapterMarks,
  calculateBlueprintPaperMarks,
  findIncompleteBlueprintRows,
  groupBlueprintRowsForOutput,
} from "@/lib/paper-builder/blueprint-rules";
import {
  applyFinalQuestionOrder,
  createFinalQuestionOrder,
  FINAL_PAPER_ORDER_LABELS,
  type FinalPaperOrderMode,
  reconcileFinalQuestionOrder,
  replaceFinalQuestionId,
  reshuffleFinalQuestionOrder,
} from "@/lib/paper-builder/final-paper-order";
import { applyBlueprintTemplateSnapshot } from "@/lib/paper-builder/blueprint-template-rules";
import type {
  BlueprintTemplateSnapshot,
  BlueprintTemplateSummary,
  CreateBlueprintTemplateInput,
  UpdateBlueprintTemplateInput,
} from "@/lib/paper-builder/blueprint-template-types";
import type {
  BlueprintAvailability,
  BlueprintChapterDraft,
  BlueprintGeneratedRow,
  BlueprintGenerationResult,
  BlueprintPaperDraft,
  BlueprintRowDraft,
  BlueprintSelection,
} from "@/lib/paper-builder/blueprint-types";
import type { SaveGeneratedPaperInput } from "@/lib/paper-builder/saved-paper-types";
import {
  PAPER_DIFFICULTIES,
  PAPER_QUESTION_TYPES,
  type PaperBuilderQuestion,
  type PaperBuilderSubject,
  type PaperBuilderTopic,
  type PaperDetails,
  type PaperHeaderTemplate,
  type ValidatedPaper,
} from "@/lib/paper-builder/types";
import { cn } from "@/lib/utils";

export type BlueprintBuilderDataProps = {
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  headerTemplates: PaperHeaderTemplate[];
  blueprintTemplates: BlueprintTemplateSummary[];
  initialBlueprintTemplateId?: string;
  initialBlueprintTemplate?: BlueprintTemplateSnapshot | null;
};

type ActionFailure = { success: false; error: string };
type RowError = { rowId: string; message: string };

export type BlueprintBuilderActions = {
  reviewAvailability: (input: BlueprintPaperDraft) => Promise<
    | ActionFailure
    | { success: true; availability: BlueprintAvailability[]; totalMarks: number }
  >;
  generatePaper: (input: BlueprintPaperDraft) => Promise<
    | (ActionFailure & { rowErrors: RowError[] })
    | { success: true; result: BlueprintGenerationResult }
  >;
  getReplacementCandidates?: (
    input: BlueprintPaperDraft,
    selections: BlueprintSelection[],
    rowId: string,
    replaceQuestionId?: string,
  ) => Promise<ActionFailure | { success: true; candidates: PaperBuilderQuestion[] }>;
  selectCandidate?: (
    input: BlueprintPaperDraft,
    selections: BlueprintSelection[],
    rowId: string,
    candidateId: string,
    replaceQuestionId?: string,
  ) => Promise<ActionFailure | { success: true; candidate: PaperBuilderQuestion }>;
  regenerateRow?: (
    input: BlueprintPaperDraft,
    selections: BlueprintSelection[],
    rowId: string,
  ) => Promise<ActionFailure | { success: true; row: BlueprintGeneratedRow }>;
  regenerateChapter?: (
    input: BlueprintPaperDraft,
    selections: BlueprintSelection[],
    chapterId: string,
  ) => Promise<
    | (ActionFailure & { rowErrors: RowError[] })
    | { success: true; rows: BlueprintGeneratedRow[] }
  >;
  validateSelection: (
    input: BlueprintPaperDraft,
    selections: BlueprintSelection[],
  ) => Promise<ActionFailure | { success: true; result: BlueprintGenerationResult }>;
  createTemplate?: (
    input: CreateBlueprintTemplateInput,
  ) => Promise<ActionFailure | { success: true; template: BlueprintTemplateSummary }>;
  updateTemplate?: (
    input: UpdateBlueprintTemplateInput,
  ) => Promise<ActionFailure | { success: true; template?: BlueprintTemplateSummary; message: string }>;
  applyTemplate?: (
    id: string,
  ) => Promise<ActionFailure | { success: true; template: BlueprintTemplateSnapshot }>;
  saveGeneratedPaper?: (
    input: SaveGeneratedPaperInput,
  ) => Promise<ActionFailure | { success: true; id: string }>;
};

export type BlueprintBuilderCapabilities = {
  templates: boolean;
  archive: boolean;
  replacement: boolean;
  rowRegeneration: boolean;
  chapterRegeneration: boolean;
};

export type BlueprintBuilderConfig = {
  capabilities: BlueprintBuilderCapabilities;
  routes: {
    templateManagementHref: string | null;
    archivePaperHref: ((paperId: string) => string) | null;
  };
  copy: {
    questionBankLabel: string;
    archiveLabel: string;
    templateManagementLabel: string;
    availabilitySuccess: string;
    generationSuccess: string;
    savedPaperSuccess: string;
    summaryDescription: string;
  };
  templateHeaderBehavior?: "snapshot" | "workspace_preference";
};

type Props = BlueprintBuilderDataProps & {
  actions: BlueprintBuilderActions;
  config: BlueprintBuilderConfig;
};

type PrintMode = "questions" | "answers" | "both";
type DocxMode = PrintMode;
type PreviewTab = "questions" | "answers";
type CandidateContext = {
  rowId: string;
  replaceQuestionId?: string;
  sectionLabel: string;
  topicName: string;
};

const initialDetails: PaperDetails = {
  institutionName: "VEXA",
  examLabel: "Class Test",
  title: "",
  courseLine: "",
  topicLine: "",
  durationMinutes: 30,
  dateText: "",
  classText: "",
  showStudentName: true,
  showRollNumber: true,
  instructions: "Attempt all questions.",
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createRow(topicId: string, index = 1): BlueprintRowDraft {
  return {
    id: newId("blueprint-row"),
    topicId,
    sectionLabel: `Section ${String.fromCharCode(64 + Math.min(index, 26))}`,
    questionType: "MCQ",
    questionCount: 3,
    marksPerQuestion: 1,
    difficulty: "any",
  };
}

function initialChaptersFromTemplate(template: BlueprintTemplateSnapshot | null | undefined) {
  if (!template) return [];
  let sequence = 0;
  return applyBlueprintTemplateSnapshot(
    template,
    (prefix) => `${prefix}-initial-${sequence++}`,
  );
}

export default function BlueprintBuilderClient({
  subjects,
  topics,
  headerTemplates,
  blueprintTemplates,
  initialBlueprintTemplateId = "",
  initialBlueprintTemplate = null,
  actions,
  config,
}: Props) {
  const {
    applyTemplate: applyTemplateAction,
    createTemplate: createTemplateAction,
    generatePaper: generatePaperAction,
    getReplacementCandidates: getReplacementCandidatesAction,
    regenerateChapter: regenerateChapterAction,
    regenerateRow: regenerateRowAction,
    reviewAvailability: reviewAvailabilityAction,
    saveGeneratedPaper: saveGeneratedPaperAction,
    selectCandidate: selectCandidateAction,
    updateTemplate: updateTemplateAction,
    validateSelection: validateSelectionAction,
  } = actions;
  const { capabilities, copy, routes } = config;
  const templateHeaderBehavior = config.templateHeaderBehavior ?? "snapshot";
  const initialTemplateSubject = initialBlueprintTemplate
    ? subjects.find((subject) => subject.id === initialBlueprintTemplate.subjectId)
    : null;
  const initialTemplateChapters = initialChaptersFromTemplate(initialBlueprintTemplate);
  const initialTemplateDetails = initialBlueprintTemplate?.headerDefaults ?? {
    ...initialDetails,
    courseLine: initialTemplateSubject
      ? `${initialTemplateSubject.name} · ${initialTemplateSubject.qualificationTitle} · ${initialTemplateSubject.boardTitle}`
      : "",
    topicLine: initialTemplateChapters.map((chapter) => chapter.topicName).join(" · "),
  };
  const initialTemplateSelection = initialBlueprintTemplate?.id ?? initialBlueprintTemplateId;
  const [step, setStep] = useState(initialBlueprintTemplate ? 3 : 1);
  const [details, setDetails] = useState<PaperDetails>(initialTemplateDetails);
  const [targetMarksText, setTargetMarksText] = useState(
    initialBlueprintTemplate ? String(initialBlueprintTemplate.totalMarks) : "",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initialBlueprintTemplate?.preferredHeaderTemplateId ?? "",
  );
  const [savedBlueprintTemplates, setSavedBlueprintTemplates] = useState(blueprintTemplates);
  const [selectedBlueprintTemplateId, setSelectedBlueprintTemplateId] = useState(initialTemplateSelection);
  const [appliedBlueprintTemplateId, setAppliedBlueprintTemplateId] = useState<string | null>(
    initialBlueprintTemplate?.id ?? null,
  );
  const [loadedBlueprintTemplateId, setLoadedBlueprintTemplateId] = useState<string | null>(
    initialBlueprintTemplate?.id ?? null,
  );
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [includeHeaderDefaults, setIncludeHeaderDefaults] = useState(true);
  const [savingBlueprintTemplate, setSavingBlueprintTemplate] = useState(false);
  const [applyingBlueprintTemplate, setApplyingBlueprintTemplate] = useState(false);
  const [boardId, setBoardId] = useState(initialBlueprintTemplate?.boardId ?? "");
  const [qualificationId, setQualificationId] = useState(
    initialBlueprintTemplate?.qualificationId ?? "",
  );
  const [subjectId, setSubjectId] = useState(initialBlueprintTemplate?.subjectId ?? "");
  const [chapters, setChapters] = useState<BlueprintChapterDraft[]>(initialTemplateChapters);
  const [availability, setAvailability] = useState<BlueprintAvailability[]>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ rowId: string; message: string }>>([]);
  const [generatedRows, setGeneratedRows] = useState<BlueprintGeneratedRow[]>([]);
  const [validatedPaper, setValidatedPaper] = useState<ValidatedPaper | null>(null);
  const [finalOrderMode, setFinalOrderMode] = useState<FinalPaperOrderMode>("shuffle_within_sections");
  const [finalQuestionOrderIds, setFinalQuestionOrderIds] = useState<string[]>([]);
  const orderRevision = useRef(1);
  const [reviewing, setReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState<DocxMode | null>(null);
  const [savePaperOpen, setSavePaperOpen] = useState(false);
  const [savedPaperName, setSavedPaperName] = useState("");
  const [savedPaperDescription, setSavedPaperDescription] = useState("");
  const [savingPaper, setSavingPaper] = useState(false);
  const [lastSavedPaperId, setLastSavedPaperId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("questions");
  const [candidateContext, setCandidateContext] = useState<CandidateContext | null>(null);
  const [candidateQuestions, setCandidateQuestions] = useState<PaperBuilderQuestion[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectingCandidateId, setSelectingCandidateId] = useState<string | null>(null);
  const [regeneratingRowId, setRegeneratingRowId] = useState<string | null>(null);
  const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null);

  const boards = useMemo(() => {
    const values = new Map<string, { id: string; title: string }>();
    subjects.forEach((subject) => values.set(subject.boardId, { id: subject.boardId, title: subject.boardTitle }));
    return [...values.values()];
  }, [subjects]);
  const qualifications = useMemo(() => {
    const values = new Map<string, { id: string; title: string }>();
    subjects.filter((subject) => subject.boardId === boardId).forEach((subject) => {
      values.set(subject.qualificationId, { id: subject.qualificationId, title: subject.qualificationTitle });
    });
    return [...values.values()];
  }, [boardId, subjects]);
  const availableSubjects = useMemo(
    () => subjects.filter((subject) => subject.qualificationId === qualificationId),
    [qualificationId, subjects],
  );
  const availableTopics = useMemo(
    () => topics.filter((topic) => topic.subjectId === subjectId),
    [subjectId, topics],
  );
  const visibleBlueprintTemplates = useMemo(
    () => savedBlueprintTemplates.filter((template) => (
      template.id === selectedBlueprintTemplateId ||
      ((!boardId || template.boardId === boardId) &&
        (!qualificationId || template.qualificationId === qualificationId) &&
        (!subjectId || template.subjectId === subjectId))
    )),
    [boardId, qualificationId, savedBlueprintTemplates, selectedBlueprintTemplateId, subjectId],
  );
  const totalMarks = calculateBlueprintPaperMarks(chapters);
  const targetMarks = targetMarksText.trim() ? Number(targetMarksText) : null;
  const availabilityByRow = useMemo(
    () => new Map(availability.map((item) => [item.rowId, item])),
    [availability],
  );
  const errorsByRow = useMemo(() => new Map(rowErrors.map((item) => [item.rowId, item.message])), [rowErrors]);
  const selectedCount = generatedRows.reduce((total, row) => total + row.questions.length, 0);
  const requestedCount = chapters.flatMap((chapter) => chapter.rows).reduce((total, row) => total + row.questionCount, 0);
  const incompleteRowIds = useMemo(() => findIncompleteBlueprintRows(generatedRows), [generatedRows]);
  const selectionsComplete = generatedRows.length > 0 && incompleteRowIds.length === 0;
  const currentOutputSections = useMemo(
    () => groupBlueprintRowsForOutput(generatedRows),
    [generatedRows],
  );
  const orderedPaper = useMemo(
    () => validatedPaper
      ? applyFinalQuestionOrder(validatedPaper, finalOrderMode, finalQuestionOrderIds)
      : null,
    [finalOrderMode, finalQuestionOrderIds, validatedPaper],
  );

  const draft: BlueprintPaperDraft = {
    version: 1,
    details,
    boardId,
    qualificationId,
    subjectId,
    targetMarks,
    chapters,
  };

  const clearGenerated = () => {
    setAvailability([]);
    setRowErrors([]);
    setGeneratedRows([]);
    setValidatedPaper(null);
    setFinalQuestionOrderIds([]);
  };

  const updateDetails = <K extends keyof PaperDetails>(key: K, value: PaperDetails[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setValidatedPaper(null);
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
  };

  const applyTemplate = () => {
    const template = headerTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return toast.error("Choose a header template first.");
    setDetails((current) => ({
      ...current,
      institutionName: template.institutionName,
      examLabel: template.examLabel,
      courseLine: template.courseLine,
      durationMinutes: template.defaultDuration,
      instructions: template.defaultInstructions,
      showStudentName: template.showStudentName,
      showRollNumber: template.showRollNumber,
      classText: template.defaultClassLine ?? "",
      topicLine: template.defaultTopicLine ?? "",
    }));
    setValidatedPaper(null);
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
    toast.success(`Applied “${template.name}”.`);
  };

  const saveBlueprintTemplate = async () => {
    if (!createTemplateAction) return toast.error("Blueprint templates are not available in this builder.");
    setSavingBlueprintTemplate(true);
    try {
      const result = await createTemplateAction({
        name: templateName,
        description: templateDescription,
        includeHeaderDefaults:
          templateHeaderBehavior === "workspace_preference"
            ? Boolean(selectedTemplateId)
            : includeHeaderDefaults,
        preferredHeaderTemplateId:
          templateHeaderBehavior === "workspace_preference"
            ? selectedTemplateId || null
            : undefined,
        draft,
      });
      if (!result.success) return toast.error(result.error);
      setSavedBlueprintTemplates((current) => [...current, result.template]
        .sort((left, right) => left.name.localeCompare(right.name)));
      setSelectedBlueprintTemplateId(result.template.id);
      setLoadedBlueprintTemplateId(result.template.id);
      setSaveTemplateOpen(false);
      setTemplateName("");
      setTemplateDescription("");
      toast.success("Blueprint template saved. Generated questions were not stored.");
    } catch {
      toast.error("Could not save the blueprint template. Please try again.");
    } finally {
      setSavingBlueprintTemplate(false);
    }
  };

  const updateLoadedBlueprintTemplate = async () => {
    if (!updateTemplateAction || !loadedBlueprintTemplateId) {
      return toast.error("Apply a blueprint template before updating it.");
    }
    const loaded = savedBlueprintTemplates.find(
      (template) => template.id === loadedBlueprintTemplateId,
    );
    if (!loaded) return toast.error("The loaded blueprint template is no longer available.");

    setSavingBlueprintTemplate(true);
    try {
      const result = await updateTemplateAction({
        id: loaded.id,
        name: loaded.name,
        description: loaded.description ?? "",
        includeHeaderDefaults:
          templateHeaderBehavior === "workspace_preference"
            ? Boolean(selectedTemplateId)
            : loaded.includeHeaderDefaults,
        preferredHeaderTemplateId:
          templateHeaderBehavior === "workspace_preference"
            ? selectedTemplateId || null
            : undefined,
        draft,
      });
      if (!result.success) return toast.error(result.error);
      if (result.template) {
        setSavedBlueprintTemplates((current) => current
          .map((template) => template.id === loaded.id ? result.template! : template)
          .sort((left, right) => left.name.localeCompare(right.name)));
      }
      clearGenerated();
      setAppliedBlueprintTemplateId(null);
      setLastSavedPaperId(null);
      toast.success(result.message);
    } catch {
      toast.error("Could not update the blueprint template. Please try again.");
    } finally {
      setSavingBlueprintTemplate(false);
    }
  };

  const applySavedBlueprintTemplate = async () => {
    if (!applyTemplateAction) return toast.error("Blueprint templates are not available in this builder.");
    if (!selectedBlueprintTemplateId) return toast.error("Choose a saved blueprint template first.");
    setApplyingBlueprintTemplate(true);
    try {
      const result = await applyTemplateAction(selectedBlueprintTemplateId);
      if (!result.success) return toast.error(result.error);
      const template = result.template;
      const subject = subjects.find((item) => item.id === template.subjectId);
      if (!subject) return toast.error("The template subject is not available in this builder.");
      const nextChapters = applyBlueprintTemplateSnapshot(template, newId);

      setBoardId(template.boardId);
      setQualificationId(template.qualificationId);
      setSubjectId(template.subjectId);
      setChapters(nextChapters);
      setTargetMarksText(String(template.totalMarks));
      if (templateHeaderBehavior === "workspace_preference") {
        setSelectedTemplateId(template.preferredHeaderTemplateId ?? "");
      }
      setDetails((current) => template.headerDefaults ?? {
        ...current,
        courseLine: `${subject.name} · ${subject.qualificationTitle} · ${subject.boardTitle}`,
        topicLine: nextChapters.map((chapter) => chapter.topicName).join(" · "),
      });
      closeCandidatePicker();
      clearGenerated();
      setAppliedBlueprintTemplateId(template.id);
      setLoadedBlueprintTemplateId(template.id);
      setLastSavedPaperId(null);
      setStep(3);
      toast.success(`Applied “${template.name}”. Check availability before generating.`);
      template.applyWarnings?.forEach((warning) => toast.warning(warning));
    } catch {
      toast.error("Could not apply the blueprint template. Please try again.");
    } finally {
      setApplyingBlueprintTemplate(false);
    }
  };

  const resetAcademicScope = () => {
    setChapters([]);
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
    setDetails((current) => ({ ...current, courseLine: "", topicLine: "" }));
  };

  const selectSubject = (nextSubjectId: string) => {
    const subject = subjects.find((item) => item.id === nextSubjectId);
    setSubjectId(nextSubjectId);
    setChapters([]);
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
    setDetails((current) => ({
      ...current,
      courseLine: subject ? `${subject.name} · ${subject.qualificationTitle} · ${subject.boardTitle}` : "",
      topicLine: "",
    }));
  };

  const toggleTopic = (topic: PaperBuilderTopic) => {
    const exists = chapters.some((chapter) => chapter.topicId === topic.id);
    const next = exists
      ? chapters.filter((chapter) => chapter.topicId !== topic.id)
      : [...chapters, {
          id: newId("blueprint-chapter"),
          topicId: topic.id,
          topicName: topic.name,
          sortOrder: topic.sortOrder,
          rows: [createRow(topic.id)],
        }].sort((left, right) => left.sortOrder - right.sortOrder || left.topicName.localeCompare(right.topicName));
    setChapters(next);
    setDetails((current) => ({ ...current, topicLine: next.map((chapter) => chapter.topicName).join(" · ") }));
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
  };

  const updateRow = (chapterId: string, rowId: string, patch: Partial<BlueprintRowDraft>) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: chapter.rows.map((row) => row.id === rowId ? { ...row, ...patch } : row) }
      : chapter));
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
  };

  const addRow = (chapterId: string) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: [...chapter.rows, createRow(chapter.topicId, chapter.rows.length + 1)] }
      : chapter));
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
  };

  const removeRow = (chapterId: string, rowId: string) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: chapter.rows.filter((row) => row.id !== rowId) }
      : chapter));
    clearGenerated();
    setAppliedBlueprintTemplateId(null);
    setLastSavedPaperId(null);
  };

  const reviewAvailability = async () => {
    setReviewing(true);
    try {
      const result = await reviewAvailabilityAction(draft);
      if (!result.success) return toast.error(result.error);
      setAvailability(result.availability);
      setRowErrors([]);
      setStep(4);
      toast.success(copy.availabilitySuccess);
    } finally {
      setReviewing(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generatePaperAction(draft);
      if (!result.success) {
        setRowErrors(result.rowErrors);
        toast.error(result.error);
        return;
      }
      applyGeneration(result.result, true);
      setStep(5);
      toast.success(copy.generationSuccess);
    } finally {
      setGenerating(false);
    }
  };

  const applyGeneration = (result: BlueprintGenerationResult, resetOrder = false) => {
    setGeneratedRows(result.rows);
    setValidatedPaper(result.paper);
    setFinalQuestionOrderIds((current) => {
      if (resetOrder || current.length === 0) {
        orderRevision.current += 1;
        return createFinalQuestionOrder(result.paper.sections, finalOrderMode, orderRevision.current);
      }
      return reconcileFinalQuestionOrder(result.paper.sections, finalOrderMode, current);
    });
    setRowErrors([]);
    setLastSavedPaperId(null);
  };

  const updateGeneratedRow = (rowId: string, updater: (questions: PaperBuilderQuestion[]) => PaperBuilderQuestion[]) => {
    const nextRows = generatedRows.map((row) => row.id === rowId ? { ...row, questions: updater(row.questions) } : row);
    setGeneratedRows(nextRows);
    setFinalQuestionOrderIds((current) => reconcileFinalQuestionOrder(
      groupBlueprintRowsForOutput(nextRows),
      finalOrderMode,
      current,
    ));
    setValidatedPaper(null);
    setLastSavedPaperId(null);
  };

  const moveQuestion = (rowId: string, index: number, direction: -1 | 1) => {
    updateGeneratedRow(rowId, (questions) => {
      const next = [...questions];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const currentSelections = () => generatedRows.map((row) => ({
    rowId: row.id,
    questionIds: row.questions.map((question) => question.id),
  }));

  const closeCandidatePicker = () => {
    setCandidateContext(null);
    setCandidateQuestions([]);
    setCandidateSearch("");
    setSelectingCandidateId(null);
  };

  const openCandidatePicker = async (row: BlueprintGeneratedRow, replaceQuestionId?: string) => {
    if (!getReplacementCandidatesAction) return toast.error("Question replacement is not available in this builder.");
    const context = {
      rowId: row.id,
      replaceQuestionId,
      sectionLabel: row.sectionLabel,
      topicName: row.topicName,
    };
    setCandidateContext(context);
    setCandidateQuestions([]);
    setCandidateSearch("");
    setLoadingCandidates(true);
    try {
      const result = await getReplacementCandidatesAction(
        draft,
        currentSelections(),
        row.id,
        replaceQuestionId,
      );
      if (!result.success) {
        closeCandidatePicker();
        return toast.error(result.error);
      }
      setCandidateQuestions(result.candidates);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const chooseCandidate = async (candidateId: string) => {
    if (!selectCandidateAction) return toast.error("Question replacement is not available in this builder.");
    if (!candidateContext) return;
    setSelectingCandidateId(candidateId);
    try {
      const result = await selectCandidateAction(
        draft,
        currentSelections(),
        candidateContext.rowId,
        candidateId,
        candidateContext.replaceQuestionId,
      );
      if (!result.success) return toast.error(result.error);
      const nextRows = applyBlueprintCandidate(
        generatedRows,
        candidateContext.rowId,
        result.candidate,
        candidateContext.replaceQuestionId,
      );
      setGeneratedRows(nextRows);
      setLastSavedPaperId(null);
      setFinalQuestionOrderIds((current) => {
        const replaced = candidateContext.replaceQuestionId
          ? replaceFinalQuestionId(current, candidateContext.replaceQuestionId, result.candidate.id)
          : current;
        return reconcileFinalQuestionOrder(
          groupBlueprintRowsForOutput(nextRows),
          finalOrderMode,
          replaced,
        );
      });
      setValidatedPaper(null);
      setRowErrors((current) => current.filter((item) => item.rowId !== candidateContext.rowId));
      closeCandidatePicker();
      toast.success(candidateContext.replaceQuestionId ? "Question replaced." : "Missing question added.");
    } finally {
      setSelectingCandidateId(null);
    }
  };

  const regenerateRow = async (rowId: string) => {
    if (!regenerateRowAction) return toast.error("Row regeneration is not available in this builder.");
    setRegeneratingRowId(rowId);
    try {
      const result = await regenerateRowAction(draft, currentSelections(), rowId);
      if (!result.success) return toast.error(result.error);
      const applied = applyBlueprintRegeneratedRows(generatedRows, [result.row], [rowId]);
      setGeneratedRows(applied.rows);
      setLastSavedPaperId(null);
      setFinalQuestionOrderIds((current) => reconcileFinalQuestionOrder(
        groupBlueprintRowsForOutput(applied.rows),
        finalOrderMode,
        current,
      ));
      setValidatedPaper(null);
      setRowErrors((current) => current.filter((item) => item.rowId !== rowId));
      toast.success("Blueprint row regenerated. Other rows were preserved.");
    } finally {
      setRegeneratingRowId(null);
    }
  };

  const regenerateChapter = async (chapterId: string, chapterRowIds: string[]) => {
    if (!regenerateChapterAction) return toast.error("Chapter regeneration is not available in this builder.");
    setRegeneratingChapterId(chapterId);
    try {
      const result = await regenerateChapterAction(draft, currentSelections(), chapterId);
      if (!result.success) {
        setRowErrors((current) => [
          ...current.filter((item) => !chapterRowIds.includes(item.rowId)),
          ...result.rowErrors,
        ]);
        result.rowErrors.forEach((item) => toast.error(item.message));
        if (result.rowErrors.length === 0) toast.error(result.error);
        return;
      }
      const applied = applyBlueprintRegeneratedRows(generatedRows, result.rows, chapterRowIds);
      setGeneratedRows(applied.rows);
      setLastSavedPaperId(null);
      setFinalQuestionOrderIds((current) => reconcileFinalQuestionOrder(
        groupBlueprintRowsForOutput(applied.rows),
        finalOrderMode,
        current,
      ));
      setValidatedPaper(null);
      setRowErrors((current) => current.filter((item) => !chapterRowIds.includes(item.rowId)));
      toast.success("Chapter regenerated. Every other chapter was preserved.");
    } finally {
      setRegeneratingChapterId(null);
    }
  };

  const validateReview = async () => {
    setValidating(true);
    try {
      const result = await validateSelectionAction(draft, generatedRows.map((row) => ({
        rowId: row.id,
        questionIds: row.questions.map((question) => question.id),
      })));
      if (!result.success) return toast.error(result.error);
      applyGeneration(result.result);
      setPreviewTab("questions");
      setStep(6);
      requestAnimationFrame(() => document.getElementById("blueprint-paper-preview")?.scrollIntoView({ behavior: "smooth" }));
    } finally {
      setValidating(false);
    }
  };

  const changeFinalOrderMode = (mode: FinalPaperOrderMode) => {
    setFinalOrderMode(mode);
    orderRevision.current += 1;
    setFinalQuestionOrderIds(createFinalQuestionOrder(
      currentOutputSections,
      mode,
      orderRevision.current,
    ));
    setLastSavedPaperId(null);
  };

  const reshuffleFinalOrder = () => {
    if (finalOrderMode === "chapter_wise" || !selectionsComplete) return;
    const result = reshuffleFinalQuestionOrder(
      currentOutputSections,
      finalOrderMode,
      finalQuestionOrderIds,
      orderRevision.current + 1,
    );
    orderRevision.current = result.revision;
    setFinalQuestionOrderIds(result.ids);
    setLastSavedPaperId(null);
    toast.success("Final paper order reshuffled. Chapter-wise review was not changed.");
  };

  const printPaper = (mode: PrintMode) => {
    if (!orderedPaper) return toast.error("Validate the current blueprint before printing.");
    document.documentElement.dataset.paperPrintMode = mode;
    const cleanup = () => {
      delete document.documentElement.dataset.paperPrintMode;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  };

  const downloadDocx = async (mode: DocxMode) => {
    if (!orderedPaper) return toast.error("Validate the current blueprint before downloading DOCX.");
    setDownloadingDocx(mode);
    try {
      const { downloadPaperDocx } = await import("@/lib/paper-builder/docx");
      await downloadPaperDocx(orderedPaper, mode);
      toast.success("Editable DOCX downloaded.");
    } catch {
      toast.error("Could not generate the DOCX. Please try again.");
    } finally {
      setDownloadingDocx(null);
    }
  };

  const saveFinalPaper = async () => {
    if (!saveGeneratedPaperAction) return toast.error(`${copy.archiveLabel} is not available in this builder.`);
    if (!orderedPaper || !validatedPaper || !selectionsComplete) {
      return toast.error("Validate a complete paper before saving it.");
    }
    setSavingPaper(true);
    try {
      const result = await saveGeneratedPaperAction({
        name: savedPaperName,
        description: savedPaperDescription,
        draft,
        selections: currentSelections(),
        finalOrderMode,
        orderedQuestionIds: finalQuestionOrderIds,
        questionVersions: orderedPaper.sections.flatMap((section) => section.questions).map((question) => ({
          id: question.id,
          updatedAt: question.sourceUpdatedAt ?? "",
        })),
        sourceBlueprintTemplateId: appliedBlueprintTemplateId,
      });
      if (!result.success) return toast.error(result.error);
      setLastSavedPaperId(result.id);
      setSavePaperOpen(false);
      setSavedPaperName("");
      setSavedPaperDescription("");
      toast.success(copy.savedPaperSuccess);
    } catch {
      toast.error("Could not save this generated paper. Please try again.");
    } finally {
      setSavingPaper(false);
    }
  };

  const stepReady = [
    false,
    Boolean(details.institutionName.trim() && details.examLabel.trim() && details.durationMinutes > 0),
    Boolean(subjectId && chapters.length > 0),
    Boolean(chapters.length > 0 && totalMarks > 0 && (targetMarks === null || targetMarks === totalMarks)),
    availability.length > 0 && availability.every((item) => item.status !== "insufficient"),
    selectionsComplete,
    Boolean(validatedPaper),
  ];

  return (
    <div className="space-y-6">
      {capabilities.templates && (
        <>
          {initialBlueprintTemplate?.applyWarnings?.map((warning) => (
            <div key={warning} className="paper-builder-screen-only rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
              {warning}
            </div>
          ))}
          <SavedBlueprintTemplateControls
            templates={visibleBlueprintTemplates}
            selectedTemplateId={selectedBlueprintTemplateId}
            canSave={Boolean(boardId && qualificationId && subjectId && chapters.length > 0 && totalMarks > 0)}
            applying={applyingBlueprintTemplate}
            updating={savingBlueprintTemplate}
            loadedTemplateId={loadedBlueprintTemplateId}
            templateManagementHref={routes.templateManagementHref}
            templateManagementLabel={copy.templateManagementLabel}
            onTemplateChange={setSelectedBlueprintTemplateId}
            onApply={applySavedBlueprintTemplate}
            onSave={() => setSaveTemplateOpen(true)}
            onUpdate={updateLoadedBlueprintTemplate}
          />
        </>
      )}

      <WizardProgress step={step} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          {step >= 5 && generatedRows.length > 0 && (
            <FinalPaperOrderControls
              mode={finalOrderMode}
              complete={selectionsComplete}
              onModeChange={changeFinalOrderMode}
              onReshuffle={reshuffleFinalOrder}
            />
          )}

          {step === 1 && (
            <PaperDetailsStep
              details={details}
              targetMarksText={targetMarksText}
              templates={headerTemplates}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={setSelectedTemplateId}
              onApplyTemplate={applyTemplate}
              onDetailsChange={updateDetails}
              onTargetMarksChange={(value) => { setTargetMarksText(value); clearGenerated(); setAppliedBlueprintTemplateId(null); setLastSavedPaperId(null); }}
            />
          )}

          {step === 2 && (
            <AcademicStep
              boards={boards}
              qualifications={qualifications}
              subjects={availableSubjects}
              topics={availableTopics}
              boardId={boardId}
              qualificationId={qualificationId}
              subjectId={subjectId}
              selectedTopicIds={chapters.map((chapter) => chapter.topicId)}
              onBoardChange={(value) => { setBoardId(value); setQualificationId(""); setSubjectId(""); resetAcademicScope(); }}
              onQualificationChange={(value) => { setQualificationId(value); setSubjectId(""); resetAcademicScope(); }}
              onSubjectChange={selectSubject}
              onTopicToggle={toggleTopic}
            />
          )}

          {step === 3 && (
            <MatrixStep chapters={chapters} onAddRow={addRow} onRemoveRow={removeRow} onUpdateRow={updateRow} />
          )}

          {step === 4 && (
            <AvailabilityStep chapters={chapters} availabilityByRow={availabilityByRow} errorsByRow={errorsByRow} onRefresh={reviewAvailability} reviewing={reviewing} />
          )}

          {step === 5 && (
            <GeneratedReviewStep
              chapters={chapters}
              rows={generatedRows}
              requestedCount={requestedCount}
              selectedCount={selectedCount}
              errorsByRow={errorsByRow}
              onMove={moveQuestion}
              onRemove={(rowId, questionId) => updateGeneratedRow(rowId, (questions) => questions.filter((question) => question.id !== questionId))}
              onSelectQuestion={openCandidatePicker}
              onRegenerateRow={regenerateRow}
              onRegenerateChapter={regenerateChapter}
              onRegenerate={generate}
              generating={generating}
              regeneratingRowId={regeneratingRowId}
              regeneratingChapterId={regeneratingChapterId}
              replacementEnabled={capabilities.replacement}
              questionRemovalEnabled={capabilities.replacement || capabilities.rowRegeneration}
              rowRegenerationEnabled={capabilities.rowRegeneration}
              chapterRegenerationEnabled={capabilities.chapterRegeneration}
            />
          )}

          {step === 6 && orderedPaper && (
            <PreviewStep
              paper={orderedPaper}
              previewTab={previewTab}
              downloadingDocx={downloadingDocx}
              onPreviewTab={setPreviewTab}
              onPrint={printPaper}
              onDownload={downloadDocx}
              onSave={() => setSavePaperOpen(true)}
              savedPaperId={lastSavedPaperId}
              archiveEnabled={capabilities.archive}
              archiveLabel={copy.archiveLabel}
              archivePaperHref={routes.archivePaperHref}
            />
          )}
        </div>

        <BlueprintSummary
          chapters={chapters}
          targetMarks={targetMarks}
          availability={availability}
          selectedCount={selectedCount}
          requestedCount={requestedCount}
          description={copy.summaryDescription}
        />
      </div>

      {capabilities.replacement && (
        <CandidatePickerDialog
          context={candidateContext}
          candidates={candidateQuestions}
          search={candidateSearch}
          loading={loadingCandidates}
          selectingCandidateId={selectingCandidateId}
          onSearch={setCandidateSearch}
          onClose={closeCandidatePicker}
          onSelect={chooseCandidate}
        />
      )}

      {capabilities.templates && (
        <SaveBlueprintTemplateDialog
          open={saveTemplateOpen}
          name={templateName}
          description={templateDescription}
          includeHeaderDefaults={includeHeaderDefaults}
          headerBehavior={templateHeaderBehavior}
          headerTemplates={headerTemplates}
          preferredHeaderTemplateId={selectedTemplateId}
          saving={savingBlueprintTemplate}
          totalMarks={totalMarks}
          chapterCount={chapters.length}
          onOpenChange={setSaveTemplateOpen}
          onNameChange={setTemplateName}
          onDescriptionChange={setTemplateDescription}
          onIncludeHeaderDefaultsChange={setIncludeHeaderDefaults}
          onPreferredHeaderTemplateChange={setSelectedTemplateId}
          onSave={saveBlueprintTemplate}
        />
      )}

      {capabilities.archive && (
        <SaveGeneratedPaperDialog
          open={savePaperOpen}
          name={savedPaperName}
          description={savedPaperDescription}
          saving={savingPaper}
          paper={orderedPaper}
          finalOrderMode={finalOrderMode}
          sourceTemplateName={savedBlueprintTemplates.find((template) => template.id === appliedBlueprintTemplateId)?.name ?? null}
          archiveLabel={copy.archiveLabel}
          onOpenChange={setSavePaperOpen}
          onNameChange={setSavedPaperName}
          onDescriptionChange={setSavedPaperDescription}
          onSave={saveFinalPaper}
        />
      )}

      <div className="paper-builder-screen-only sticky bottom-3 z-20 flex flex-col-reverse gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1))}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {step < 3 && (
          <Button type="button" disabled={!stepReady[step]} onClick={() => setStep((current) => current + 1)}>
            Continue <ArrowRight className="size-4" />
          </Button>
        )}
        {step === 3 && (
          <Button type="button" disabled={!stepReady[3] || reviewing} onClick={reviewAvailability}>
            <FileCheck2 className="size-4" /> {reviewing ? "Checking…" : "Review availability"}
          </Button>
        )}
        {step === 4 && (
          <Button type="button" disabled={!stepReady[4] || generating} onClick={generate}>
            <Shuffle className="size-4" /> {generating ? "Generating…" : "Generate complete paper"}
          </Button>
        )}
        {step === 5 && (
          <Button type="button" disabled={!selectionsComplete || validating} onClick={validateReview}>
            <Eye className="size-4" /> {validating ? "Validating…" : "Validate and preview"}
          </Button>
        )}
      </div>
    </div>
  );
}

function SavedBlueprintTemplateControls({
  templates,
  selectedTemplateId,
  canSave,
  applying,
  updating,
  loadedTemplateId,
  templateManagementHref,
  templateManagementLabel,
  onTemplateChange,
  onApply,
  onSave,
  onUpdate,
}: {
  templates: BlueprintTemplateSummary[];
  selectedTemplateId: string;
  canSave: boolean;
  applying: boolean;
  updating: boolean;
  loadedTemplateId: string | null;
  templateManagementHref: string | null;
  templateManagementLabel: string;
  onTemplateChange: (value: string) => void;
  onApply: () => void;
  onSave: () => void;
  onUpdate: () => void;
}) {
  const selected = templates.find((template) => template.id === selectedTemplateId);
  const loaded = templates.find((template) => template.id === loadedTemplateId);
  return (
    <section className="paper-builder-screen-only rounded-2xl border bg-card p-4" aria-labelledby="saved-blueprints-heading">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <BookTemplate className="size-4 text-primary" aria-hidden="true" />
            <h2 id="saved-blueprints-heading" className="text-sm font-semibold">Saved blueprint templates</h2>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Reuse chapter and section patterns. Generated questions are never saved with a template.
          </p>
          {loaded && (
            <p className="mt-2 text-xs font-semibold text-primary">Using template: {loaded.name}</p>
          )}
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(16rem,1fr)_auto_auto_auto] lg:w-auto">
          <Select value={selectedTemplateId} onValueChange={(value) => onTemplateChange(value || "")}>
            <SelectTrigger className="w-full sm:min-w-72" aria-label="Saved blueprint template">
              <SelectValue placeholder={templates.length ? "Choose saved blueprint" : "No saved blueprints yet"}>
                {selected ? `${selected.name} · ${selected.totalMarks} marks` : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} · {template.totalMarks} marks
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" disabled={!selectedTemplateId || applying} onClick={onApply}>
            <BookTemplate className={cn("size-4", applying && "animate-pulse")} />
            {applying ? "Applying…" : "Apply"}
          </Button>
          <Button type="button" disabled={!canSave || applying} onClick={onSave}>
            <Save className="size-4" /> Save as Blueprint Template
          </Button>
          {loaded && (
            <Button type="button" variant="outline" disabled={!canSave || applying || updating} onClick={onUpdate}>
              <Save className="size-4" /> {updating ? "Updating…" : "Update template"}
            </Button>
          )}
          {templateManagementHref && (
            <Link href={templateManagementHref} className={buttonVariants({ variant: "outline" })}>
              <Settings2 className="size-4" /> {templateManagementLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function SaveBlueprintTemplateDialog({
  open,
  name,
  description,
  includeHeaderDefaults,
  headerBehavior,
  headerTemplates,
  preferredHeaderTemplateId,
  saving,
  totalMarks,
  chapterCount,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onIncludeHeaderDefaultsChange,
  onPreferredHeaderTemplateChange,
  onSave,
}: {
  open: boolean;
  name: string;
  description: string;
  includeHeaderDefaults: boolean;
  headerBehavior: "snapshot" | "workspace_preference";
  headerTemplates: PaperHeaderTemplate[];
  preferredHeaderTemplateId: string;
  saving: boolean;
  totalMarks: number;
  chapterCount: number;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onIncludeHeaderDefaultsChange: (checked: boolean) => void;
  onPreferredHeaderTemplateChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save blueprint template</DialogTitle>
          <DialogDescription>
            Save this {chapterCount}-chapter, {totalMarks}-mark pattern for reuse. Selected questions, availability, and generated output are not stored.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Template name">
            <Input
              value={name}
              maxLength={200}
              autoFocus
              placeholder="e.g. Class 12 IP · 25 marks"
              onChange={(event) => onNameChange(event.target.value)}
            />
          </Field>
          <Field label="Description (optional)">
            <Textarea
              value={description}
              maxLength={1000}
              rows={3}
              placeholder="When or how this blueprint should be used"
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </Field>
          {headerBehavior === "workspace_preference" ? (
            <Field label="Preferred header template (optional)">
              <Select
                value={preferredHeaderTemplateId || "none"}
                onValueChange={(value) => onPreferredHeaderTemplateChange(!value || value === "none" ? "" : value)}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preferred header</SelectItem>
                  {headerTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-5 text-muted-foreground">
                Stores only the active teacher header-template reference. If it later becomes unavailable, the blueprint still applies without it.
              </p>
            </Field>
          ) : (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3">
              <Checkbox
                checked={includeHeaderDefaults}
                onCheckedChange={(checked) => onIncludeHeaderDefaultsChange(checked === true)}
              />
              <span>
                <span className="block text-sm font-medium">Include current header defaults</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Copies the current institution, exam label, class, duration, instructions, and optional title/topic fields. The reusable Paper Header Template remains separate.
                </span>
              </span>
            </label>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!name.trim() || saving} onClick={onSave}>
              <Save className="size-4" /> {saving ? "Saving…" : "Save blueprint template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SaveGeneratedPaperDialog({
  open,
  name,
  description,
  saving,
  paper,
  finalOrderMode,
  sourceTemplateName,
  archiveLabel,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onSave,
}: {
  open: boolean;
  name: string;
  description: string;
  saving: boolean;
  paper: ValidatedPaper | null;
  finalOrderMode: FinalPaperOrderMode;
  sourceTemplateName: string | null;
  archiveLabel: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
}) {
  const count = paper?.sections.reduce((total, section) => total + section.questions.length, 0) ?? 0;
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!saving) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save Generated Paper</DialogTitle>
          <DialogDescription>Save the exact validated questions, final order, answers, header, and archive-owned image copies. This snapshot will not change when Question Bank records change.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <DialogSummary label="Scope" value={paper ? `${paper.boardTitle} · ${paper.qualificationTitle} · ${paper.subjectName}` : "Not validated"} />
            <DialogSummary label="Paper" value={`${count} questions · ${paper?.totalMarks ?? 0} marks`} />
            <DialogSummary label="Final order" value={FINAL_PAPER_ORDER_LABELS[finalOrderMode]} />
            <DialogSummary label="Source" value={sourceTemplateName ?? "Manual blueprint"} />
          </div>
          <Field label="Saved paper name"><Input value={name} maxLength={200} autoFocus placeholder="e.g. Class 12 IP Friday Test" onChange={(event) => onNameChange(event.target.value)} /></Field>
          <Field label="Description (optional)"><Textarea value={description} maxLength={3000} rows={3} placeholder="Internal note about this exact paper" onChange={(event) => onDescriptionChange(event.target.value)} /></Field>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="button" disabled={!name.trim() || !paper || saving} onClick={onSave}><Save className="size-4" /> {saving ? "Saving exact paper…" : `Save to ${archiveLabel}`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogSummary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div>;
}

function WizardProgress({ step }: { step: number }) {
  const labels = ["Header", "Academics", "Matrix", "Availability", "Review", "Output"];
  return (
    <ol className="paper-builder-screen-only grid grid-cols-3 gap-2 rounded-2xl border bg-card p-3 lg:grid-cols-6" aria-label="Blueprint Builder progress">
      {labels.map((label, index) => {
        const number = index + 1;
        const active = number === step;
        const complete = number < step;
        return (
          <li key={label} className={cn("flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold sm:text-sm", active && "bg-primary text-primary-foreground", complete && "bg-primary/10 text-primary", number > step && "text-muted-foreground")}>
            <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border text-xs", active && "border-primary-foreground/40", complete && "border-primary/30")}>{complete ? <CheckCircle2 className="size-4" /> : number}</span>
            <span className="truncate">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PaperDetailsStep({
  details,
  targetMarksText,
  templates,
  selectedTemplateId,
  onTemplateChange,
  onApplyTemplate,
  onDetailsChange,
  onTargetMarksChange,
}: {
  details: PaperDetails;
  targetMarksText: string;
  templates: PaperHeaderTemplate[];
  selectedTemplateId: string;
  onTemplateChange: (value: string) => void;
  onApplyTemplate: () => void;
  onDetailsChange: <K extends keyof PaperDetails>(key: K, value: PaperDetails[K]) => void;
  onTargetMarksChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader><StepHeading number="1" title="Paper details" description="Apply a reusable header, then adjust only what this paper needs." /></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Field label="Header template"><Select value={selectedTemplateId} onValueChange={(value) => onTemplateChange(value || "")}><SelectTrigger className="w-full"><SelectValue placeholder="Choose a saved template">{templates.find((template) => template.id === selectedTemplateId)?.name}</SelectValue></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent></Select></Field>
          <Button type="button" variant="outline" disabled={!selectedTemplateId} onClick={onApplyTemplate}>Apply template</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Institution"><Input value={details.institutionName} maxLength={200} onChange={(event) => onDetailsChange("institutionName", event.target.value)} /></Field>
          <Field label="Exam label"><Input value={details.examLabel} maxLength={200} onChange={(event) => onDetailsChange("examLabel", event.target.value)} /></Field>
          <Field label="Course / class / board line"><Input value={details.courseLine} maxLength={500} placeholder="Filled automatically after subject selection" onChange={(event) => onDetailsChange("courseLine", event.target.value)} /></Field>
          <Field label="Optional title"><Input value={details.title} maxLength={200} placeholder="Leave blank to omit" onChange={(event) => onDetailsChange("title", event.target.value)} /></Field>
          <Field label="Optional topic / subtitle"><Input value={details.topicLine} maxLength={1_000} placeholder="Leave blank to omit" onChange={(event) => onDetailsChange("topicLine", event.target.value)} /></Field>
          <Field label="Duration (minutes)"><Input type="number" min={1} max={300} value={details.durationMinutes} onChange={(event) => onDetailsChange("durationMinutes", Number(event.target.value))} /></Field>
          <Field label="Date"><Input value={details.dateText} maxLength={200} placeholder="Optional" onChange={(event) => onDetailsChange("dateText", event.target.value)} /></Field>
          <Field label="Class"><Input value={details.classText} maxLength={200} placeholder="Optional" onChange={(event) => onDetailsChange("classText", event.target.value)} /></Field>
          <Field label="Optional target marks"><Input type="number" min={1} max={10_000} value={targetMarksText} placeholder="Calculated total is authoritative" onChange={(event) => onTargetMarksChange(event.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleLabel label="Student name line" checked={details.showStudentName} onChange={(checked) => onDetailsChange("showStudentName", checked)} />
          <ToggleLabel label="Roll number line" checked={details.showRollNumber} onChange={(checked) => onDetailsChange("showRollNumber", checked)} />
        </div>
        <Field label="Instructions"><Textarea rows={5} value={details.instructions} maxLength={3_000} onChange={(event) => onDetailsChange("instructions", event.target.value)} /></Field>
      </CardContent>
    </Card>
  );
}

function AcademicStep({ boards, qualifications, subjects, topics, boardId, qualificationId, subjectId, selectedTopicIds, onBoardChange, onQualificationChange, onSubjectChange, onTopicToggle }: {
  boards: Array<{ id: string; title: string }>;
  qualifications: Array<{ id: string; title: string }>;
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  boardId: string;
  qualificationId: string;
  subjectId: string;
  selectedTopicIds: string[];
  onBoardChange: (value: string) => void;
  onQualificationChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTopicToggle: (topic: PaperBuilderTopic) => void;
}) {
  return (
    <Card>
      <CardHeader><StepHeading number="2" title="Subject and chapters" description="Choose the academic scope, then select every chapter that needs a marks allocation." /></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <FilterSelect label="Board" value={boardId} placeholder="Select board" options={boards.map((item) => ({ value: item.id, label: item.title }))} onChange={onBoardChange} />
          <FilterSelect label="Qualification / class" value={qualificationId} placeholder="Select qualification" disabled={!boardId} options={qualifications.map((item) => ({ value: item.id, label: item.title }))} onChange={onQualificationChange} />
          <FilterSelect label="Subject" value={subjectId} placeholder="Select subject" disabled={!qualificationId} options={subjects.map((item) => ({ value: item.id, label: item.code ? `${item.name} (${item.code})` : item.name }))} onChange={onSubjectChange} />
        </div>
        {!subjectId ? <EmptyState message="Choose a subject to see its chapters." /> : topics.length === 0 ? <EmptyState message="This subject has no chapters available." /> : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {topics.map((topic) => (
              <label key={topic.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium hover:bg-muted/40">
                <Checkbox checked={selectedTopicIds.includes(topic.id)} onCheckedChange={() => onTopicToggle(topic)} />
                <span>{topic.name}</span>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MatrixStep({ chapters, onAddRow, onRemoveRow, onUpdateRow }: {
  chapters: BlueprintChapterDraft[];
  onAddRow: (chapterId: string) => void;
  onRemoveRow: (chapterId: string, rowId: string) => void;
  onUpdateRow: (chapterId: string, rowId: string, patch: Partial<BlueprintRowDraft>) => void;
}) {
  return (
    <Card>
      <CardHeader><StepHeading number="3" title="Blueprint matrix" description="Allocate question type, count, marks, and difficulty separately for every chapter." /></CardHeader>
      <CardContent className="space-y-5">
        {chapters.map((chapter) => (
          <section key={chapter.id} className="rounded-2xl border bg-muted/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold">{chapter.topicName}</h3><p className="mt-1 text-sm text-muted-foreground">Chapter total: {calculateBlueprintChapterMarks(chapter)} marks</p></div>
              <Button type="button" size="sm" variant="outline" onClick={() => onAddRow(chapter.id)}><Plus className="size-4" /> Add row</Button>
            </div>
            <div className="mt-4 space-y-3">
              {chapter.rows.map((row, index) => (
                <div key={row.id} className="rounded-xl border bg-background p-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[auto_1.1fr_1.4fr_0.7fr_0.7fr_0.9fr_auto] xl:items-end">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                    <Field label="Section label"><Input value={row.sectionLabel} maxLength={100} onChange={(event) => onUpdateRow(chapter.id, row.id, { sectionLabel: event.target.value })} /></Field>
                    <Field label="Question type"><Select value={row.questionType} onValueChange={(value) => onUpdateRow(chapter.id, row.id, { questionType: (value || "MCQ") as BankQuestionTypeValue })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAPER_QUESTION_TYPES.map((type) => <SelectItem key={type} value={type}>{BANK_QUESTION_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></Field>
                    <Field label="Questions"><Input type="number" min={1} max={100} value={row.questionCount} onChange={(event) => onUpdateRow(chapter.id, row.id, { questionCount: Number(event.target.value) })} /></Field>
                    <Field label="Marks each"><Input type="number" min={1} max={100} value={row.marksPerQuestion} onChange={(event) => onUpdateRow(chapter.id, row.id, { marksPerQuestion: Number(event.target.value) })} /></Field>
                    <Field label="Difficulty"><Select value={row.difficulty} onValueChange={(value) => onUpdateRow(chapter.id, row.id, { difficulty: (value || "any") as BlueprintRowDraft["difficulty"] })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{PAPER_DIFFICULTIES.map((difficulty) => <SelectItem key={difficulty} value={difficulty} className="capitalize">{difficulty === "any" ? "Mixed" : difficulty}</SelectItem>)}</SelectContent></Select></Field>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Remove row ${index + 1}`} disabled={chapter.rows.length === 1} onClick={() => onRemoveRow(chapter.id, row.id)}><Trash2 className="size-4" /></Button>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">Row marks: {row.questionCount * row.marksPerQuestion}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
        <div className="rounded-xl border border-primary/25 bg-primary/5 p-4"><p className="font-semibold">Calculated paper total: {calculateBlueprintPaperMarks(chapters)} marks</p><p className="mt-1 text-sm text-muted-foreground">The server recalculates this total before generation and export.</p></div>
      </CardContent>
    </Card>
  );
}

function AvailabilityStep({ chapters, availabilityByRow, errorsByRow, onRefresh, reviewing }: {
  chapters: BlueprintChapterDraft[];
  availabilityByRow: Map<string, BlueprintAvailability>;
  errorsByRow: Map<string, string>;
  onRefresh: () => void;
  reviewing: boolean;
}) {
  return (
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><StepHeading number="4" title="Availability review" description="Counts use exact chapter, type, marks, difficulty, and type-completeness rules." /><Button type="button" variant="outline" onClick={onRefresh} disabled={reviewing}><RefreshCw className="size-4" /> {reviewing ? "Checking…" : "Refresh counts"}</Button></div></CardHeader>
      <CardContent className="space-y-5">
        {chapters.map((chapter) => (
          <section key={chapter.id} className="rounded-2xl border p-4">
            <h3 className="font-semibold">{chapter.topicName}</h3>
            <div className="mt-3 space-y-2">
              {chapter.rows.map((row) => {
                const item = availabilityByRow.get(row.id);
                const generatedError = errorsByRow.get(row.id);
                return (
                  <div key={row.id} className="rounded-xl bg-muted/25 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div><p className="text-sm font-semibold">{row.sectionLabel} · {BANK_QUESTION_TYPE_LABELS[row.questionType]}</p><p className="mt-1 text-xs text-muted-foreground">Need {row.questionCount} × {row.marksPerQuestion} mark{row.marksPerQuestion === 1 ? "" : "s"} · {row.difficulty === "any" ? "Mixed difficulty" : row.difficulty}</p></div>
                      {item && <Badge variant={item.status === "insufficient" ? "destructive" : item.status === "low_reserve" ? "outline" : "secondary"}>{item.status === "ready" ? "Ready" : item.status === "low_reserve" ? "Low reserve" : "Insufficient"}</Badge>}
                    </div>
                    {item && <p className="mt-2 text-sm">{item.uniqueTextCount} unique usable · {item.matchingCount} matching records · {item.requiredCount} required</p>}
                    {item?.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
                    {item?.errors.map((error) => <p key={error} className="mt-1 text-xs text-destructive">{error}</p>)}
                    {generatedError && <p className="mt-1 text-xs text-destructive">{generatedError}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function FinalPaperOrderControls({ mode, complete, onModeChange, onReshuffle }: {
  mode: FinalPaperOrderMode;
  complete: boolean;
  onModeChange: (mode: FinalPaperOrderMode) => void;
  onReshuffle: () => void;
}) {
  const descriptions: Record<FinalPaperOrderMode, string> = {
    chapter_wise: "Keep the current chapter and row sequence in the final paper.",
    shuffle_within_sections: "Keep section/type groups, but mix chapters inside each section.",
    fully_shuffled: "Mix every question into one numbered final-paper sequence.",
  };
  return (
    <section className="paper-builder-screen-only mb-6 rounded-2xl border bg-card p-4 sm:p-5" aria-labelledby="final-paper-order-heading">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Shuffle className="size-4 text-primary" aria-hidden="true" />
            <h2 id="final-paper-order-heading" className="font-semibold">Final paper question order</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {descriptions[mode]} Review below remains chapter-wise.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Select value={mode} onValueChange={(value) => onModeChange((value || "shuffle_within_sections") as FinalPaperOrderMode)}>
            <SelectTrigger className="w-full sm:min-w-64" aria-label="Final paper question order">
              <SelectValue>{FINAL_PAPER_ORDER_LABELS[mode]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FINAL_PAPER_ORDER_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mode !== "chapter_wise" && (
            <Button type="button" variant="outline" disabled={!complete} onClick={onReshuffle}>
              <RefreshCw className="size-4" /> Reshuffle
            </Button>
          )}
        </div>
      </div>
      {!complete && mode !== "chapter_wise" && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          Complete every blueprint row before reshuffling or exporting.
        </p>
      )}
    </section>
  );
}

function GeneratedReviewStep({ chapters, rows, requestedCount, selectedCount, errorsByRow, onMove, onRemove, onSelectQuestion, onRegenerateRow, onRegenerateChapter, onRegenerate, generating, regeneratingRowId, regeneratingChapterId, replacementEnabled, questionRemovalEnabled, rowRegenerationEnabled, chapterRegenerationEnabled }: {
  chapters: BlueprintChapterDraft[];
  rows: BlueprintGeneratedRow[];
  requestedCount: number;
  selectedCount: number;
  errorsByRow: Map<string, string>;
  onMove: (rowId: string, index: number, direction: -1 | 1) => void;
  onRemove: (rowId: string, questionId: string) => void;
  onSelectQuestion: (row: BlueprintGeneratedRow, replaceQuestionId?: string) => void;
  onRegenerateRow: (rowId: string) => void;
  onRegenerateChapter: (chapterId: string, rowIds: string[]) => void;
  onRegenerate: () => void;
  generating: boolean;
  regeneratingRowId: string | null;
  regeneratingChapterId: string | null;
  replacementEnabled: boolean;
  questionRemovalEnabled: boolean;
  rowRegenerationEnabled: boolean;
  chapterRegenerationEnabled: boolean;
}) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return (
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><StepHeading number="5" title="Generated paper review" description="Questions are grouped by their exact blueprint chapter and row. Reordering stays within a row." /><Button type="button" variant="outline" onClick={onRegenerate} disabled={generating}><Shuffle className="size-4" /> {generating ? "Regenerating…" : "Regenerate whole paper"}</Button></div></CardHeader>
      <CardContent className="space-y-5">
        <StatusBanner good={selectedCount === requestedCount} message={`${selectedCount} of ${requestedCount} requested questions selected`} />
        {chapters.map((chapter) => {
          const chapterRows = chapter.rows.map((row) => rowsById.get(row.id)).filter((row): row is BlueprintGeneratedRow => Boolean(row));
          const chapterSelectedMarks = chapterRows.reduce((total, row) => total + row.questions.reduce((sum, question) => sum + question.marks, 0), 0);
          const chapterBusy = regeneratingChapterId === chapter.id;
          return (
          <section key={chapter.id} className="rounded-2xl border p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{chapter.topicName}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{chapterSelectedMarks} of {calculateBlueprintChapterMarks(chapter)} chapter marks selected</p>
              </div>
              {chapterRegenerationEnabled && (
                <Button type="button" variant="outline" size="sm" disabled={chapterBusy || regeneratingRowId !== null} onClick={() => onRegenerateChapter(chapter.id, chapter.rows.map((row) => row.id))}>
                  <RefreshCw className={cn("size-4", chapterBusy && "animate-spin")} /> {chapterBusy ? "Regenerating…" : "Regenerate chapter"}
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-5">
              {chapterRows.map((row) => {
                const complete = row.questions.length === row.questionCount;
                const rowBusy = regeneratingRowId === row.id;
                const rowError = errorsByRow.get(row.id);
                return (
                <div key={row.id} className="rounded-xl bg-muted/15 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{row.sectionLabel} · {BANK_QUESTION_TYPE_LABELS[row.questionType]}</p><Badge variant={complete ? "secondary" : "destructive"}>{complete ? "Complete" : "Incomplete"} · {row.questions.length}/{row.questionCount}</Badge></div>
                      <p className="mt-1 text-xs text-muted-foreground">{row.questionCount} × {row.marksPerQuestion} mark{row.marksPerQuestion === 1 ? "" : "s"} · {row.difficulty === "any" ? "Mixed difficulty" : row.difficulty}</p>
                    </div>
                    {rowRegenerationEnabled && (
                      <Button type="button" variant="outline" size="sm" disabled={rowBusy || regeneratingChapterId !== null} onClick={() => onRegenerateRow(row.id)}>
                        <RefreshCw className={cn("size-4", rowBusy && "animate-spin")} /> {rowBusy ? "Regenerating…" : "Regenerate row"}
                      </Button>
                    )}
                  </div>
                  {rowError && <p className="mt-2 text-xs text-destructive">{rowError}</p>}
                  {!complete && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-sm text-amber-900 dark:text-amber-100">This row needs {row.questionCount - row.questions.length} more question{row.questionCount - row.questions.length === 1 ? "" : "s"}. Preview and export remain blocked.</p>
                      {replacementEnabled && <Button type="button" size="sm" onClick={() => onSelectQuestion(row)}><Plus className="size-4" /> Add replacement</Button>}
                    </div>
                  )}
                  <div className="mt-3 space-y-2">
                    {row.questions.map((question, index) => (
                      <div key={question.id} className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-start">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                        <QuestionSummary question={question} />
                        <div className="flex shrink-0 flex-wrap gap-1 sm:max-w-48 sm:justify-end">
                          {replacementEnabled && <Button type="button" variant="outline" size="sm" onClick={() => onSelectQuestion(row, question.id)}>Replace</Button>}
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question up" disabled={index === 0} onClick={() => onMove(row.id, index, -1)}><ArrowUp className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question down" disabled={index === row.questions.length - 1} onClick={() => onMove(row.id, index, 1)}><ArrowDown className="size-4" /></Button>
                          {questionRemovalEnabled && <Button type="button" variant="ghost" size="sm" aria-label="Remove question" onClick={() => onRemove(row.id, question.id)}><X className="size-4" /> Remove</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )})}
            </div>
          </section>
        )})}
      </CardContent>
    </Card>
  );
}

function CandidatePickerDialog({ context, candidates, search, loading, selectingCandidateId, onSearch, onClose, onSelect }: {
  context: CandidateContext | null;
  candidates: PaperBuilderQuestion[];
  search: string;
  loading: boolean;
  selectingCandidateId: string | null;
  onSearch: (value: string) => void;
  onClose: () => void;
  onSelect: (candidateId: string) => void;
}) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filtered = candidates.filter((question) => !normalizedSearch || [
    question.questionText,
    question.source ?? "",
    question.difficulty,
    BANK_QUESTION_TYPE_LABELS[question.questionType],
  ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch)));
  return (
    <Dialog open={Boolean(context)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-5 pb-4 pt-5 pr-12">
          <DialogTitle>{context?.replaceQuestionId ? "Replace question" : "Add replacement"}</DialogTitle>
          <DialogDescription>{context ? `${context.topicName} · ${context.sectionLabel}. Every candidate is revalidated against this exact row.` : "Choose a valid candidate."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto px-5 pb-5">
          <Input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search question text or source…" aria-label="Search replacement candidates" />
          {loading ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">Loading server-validated candidates…</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">{candidates.length === 0 ? "No unused valid candidates are available for this exact row." : "No candidates match your search."}</div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground">{filtered.length} valid candidate{filtered.length === 1 ? "" : "s"}</p>
              {filtered.map((question) => (
                <article key={question.id} className="rounded-xl border bg-muted/10 p-4">
                  <QuestionSummary question={question} />
                  <CandidateAnswerReview question={question} />
                  <div className="mt-4 flex justify-end">
                    <Button type="button" size="sm" disabled={selectingCandidateId !== null} onClick={() => onSelect(question.id)}>
                      {selectingCandidateId === question.id ? "Selecting…" : context?.replaceQuestionId ? "Use this replacement" : "Add this question"}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidateAnswerReview({ question }: { question: PaperBuilderQuestion }) {
  const options = [question.optionA, question.optionB, question.optionC, question.optionD];
  const hasOptions = options.every(Boolean);
  return (
    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
      {hasOptions && <div className="grid gap-1 sm:grid-cols-2">{options.map((option, index) => <p key={`${index}-${option}`}><span className="font-semibold text-foreground">{String.fromCharCode(65 + index)}.</span> {option}</p>)}</div>}
      {question.modelAnswer && <p><span className="font-semibold text-foreground">Model answer:</span> {question.modelAnswer}</p>}
      {question.correctAnswer && <p><span className="font-semibold text-foreground">Correct answer:</span> {question.correctAnswer}</p>}
      {question.explanation && <p><span className="font-semibold text-foreground">Explanation:</span> {question.explanation}</p>}
    </div>
  );
}

function PreviewStep({ paper, previewTab, downloadingDocx, savedPaperId, archiveEnabled, archiveLabel, archivePaperHref, onPreviewTab, onPrint, onDownload, onSave }: {
  paper: ValidatedPaper;
  previewTab: PreviewTab;
  downloadingDocx: DocxMode | null;
  savedPaperId: string | null;
  archiveEnabled: boolean;
  archiveLabel: string;
  archivePaperHref: ((paperId: string) => string) | null;
  onPreviewTab: (tab: PreviewTab) => void;
  onPrint: (mode: PrintMode) => void;
  onDownload: (mode: DocxMode) => void;
  onSave: () => void;
}) {
  return (
    <section id="blueprint-paper-preview" className="space-y-5">
      <div className="paper-builder-screen-only flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-semibold">Blueprint paper output</h2><p className="mt-1 text-sm text-muted-foreground">Server-validated. Save the exact final paper when it is ready.</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant={previewTab === "questions" ? "default" : "outline"} onClick={() => onPreviewTab("questions")}><Eye className="size-4" /> Student paper</Button><Button type="button" variant={previewTab === "answers" ? "default" : "outline"} onClick={() => onPreviewTab("answers")}><CheckCircle2 className="size-4" /> Answer key</Button>{archiveEnabled && <Button type="button" onClick={onSave}><Save className="size-4" /> Save Generated Paper</Button>}{savedPaperId && archivePaperHref && <Link href={archivePaperHref(savedPaperId)} className={buttonVariants({ variant: "outline" })}>Open in {archiveLabel}</Link>}</div>
      </div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => onPrint("questions")}><Printer className="size-4" /> Print question paper</Button><Button type="button" variant="outline" onClick={() => onPrint("answers")}><Printer className="size-4" /> Print answer key</Button><Button type="button" onClick={() => onPrint("both")}><Printer className="size-4" /> Print both</Button></div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("questions")}><FileDown className="size-4" /> {downloadingDocx === "questions" ? "Generating…" : "Download Question Paper DOCX"}</Button><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("answers")}><FileDown className="size-4" /> {downloadingDocx === "answers" ? "Generating…" : "Download Answer Key DOCX"}</Button><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("both")}><FileDown className="size-4" /> {downloadingDocx === "both" ? "Generating…" : "Download Both DOCX"}</Button></div>
      <div className={cn(previewTab !== "questions" && "paper-builder-preview-hidden")}><PaperQuestionDocument paper={paper} /></div>
      <div className={cn(previewTab !== "answers" && "paper-builder-preview-hidden")}><PaperAnswerKeyDocument paper={paper} /></div>
    </section>
  );
}

function BlueprintSummary({ chapters, targetMarks, availability, selectedCount, requestedCount, description }: { chapters: BlueprintChapterDraft[]; targetMarks: number | null; availability: BlueprintAvailability[]; selectedCount: number; requestedCount: number; description: string }) {
  const total = calculateBlueprintPaperMarks(chapters);
  const insufficient = availability.filter((item) => item.status === "insufficient").length;
  return (
    <aside className="paper-builder-screen-only space-y-4 rounded-2xl border bg-card p-4 xl:sticky xl:top-6">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blueprint summary</p><p className="mt-2 text-2xl font-bold">{total} marks</p>{targetMarks !== null && <p className={cn("mt-1 text-sm", targetMarks === total ? "text-emerald-600" : "text-destructive")}>Target: {targetMarks} marks</p>}</div>
      <div className="space-y-2 text-sm"><SummaryRow label="Chapters" value={chapters.length} /><SummaryRow label="Rows" value={chapters.flatMap((chapter) => chapter.rows).length} /><SummaryRow label="Questions" value={requestedCount} />{selectedCount > 0 && <SummaryRow label="Selected" value={selectedCount} />}</div>
      {availability.length > 0 && <StatusBanner good={insufficient === 0} message={insufficient === 0 ? "All rows have sufficient availability" : `${insufficient} row${insufficient === 1 ? "" : "s"} need attention`} />}
      <p className="text-xs leading-5 text-muted-foreground">{description}</p>
    </aside>
  );
}

function StepHeading({ number, title, description }: { number: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{number}</span><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1 leading-6">{description}</CardDescription></div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function FilterSelect({ label, value, options, onChange, placeholder, disabled }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) {
  return <Field label={label}><Select value={value} onValueChange={(next) => onChange(next || "")} disabled={disabled}><SelectTrigger className="w-full"><SelectValue placeholder={placeholder}>{options.find((option) => option.value === value)?.label}</SelectValue></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>;
}

function ToggleLabel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium"><Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />{label}</label>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">{message}</div>;
}

function StatusBanner({ good, message }: { good: boolean; message: string }) {
  return <div className={cn("flex items-center gap-2 rounded-xl border p-3 text-sm font-medium", good ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200")}>{good ? <CheckCircle2 className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0" />}{message}</div>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-semibold">{value}</span></div>;
}

function QuestionSummary({ question }: { question: PaperBuilderQuestion }) {
  return <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{BANK_QUESTION_TYPE_LABELS[question.questionType]}</Badge>{question.imageUrl && <Badge variant="secondary"><ImageIcon className="size-3" /> Has image</Badge>}<span className="text-xs text-muted-foreground">{question.difficulty} · {question.marks} mark{question.marks === 1 ? "" : "s"}</span>{question.source && <span className="text-xs text-muted-foreground">Source: {question.source}</span>}</div><p className="mt-2 text-sm font-medium leading-6">{question.questionText}</p></div>;
}
