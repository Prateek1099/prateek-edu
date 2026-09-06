"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  Copy,
  Eye,
  FileDown,
  FileCheck2,
  ImageIcon,
  ListChecks,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  BANK_QUESTION_TYPE_LABELS,
  type BankQuestionTypeValue,
} from "@/lib/bank-questions";
import { PaperAnswerKeyDocument, PaperQuestionDocument } from "@/components/paper-builder/PaperBuilderDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  calculatePatternMarks,
  findDuplicateSelection,
  normalizeQuestionText,
  shuffled,
  uniqueEligibleQuestions,
} from "@/lib/paper-builder/rules";
import type { TeacherSaveGeneratedPaperInput } from "@/lib/paper-builder/saved-paper-types";
import { workspacePaperTemplateRowsToPatterns } from "@/lib/paper-builder/workspace-paper-template-rules";
import type {
  WorkspacePaperTemplateApplyResult,
  WorkspacePaperTemplateInput,
  WorkspacePaperTemplateMutationResult,
  WorkspacePaperTemplateSnapshot,
  WorkspacePaperTemplateSummary,
} from "@/lib/paper-builder/workspace-paper-template-types";
import {
  PAPER_DIFFICULTIES,
  PAPER_QUESTION_TYPES,
  type PaperBuilderQuestion,
  type PaperHeaderTemplate,
  type PaperHeaderTemplateInput,
  type PaperBuilderSubject,
  type PaperBuilderTopic,
  type PaperDetails,
  type PaperPatternRow,
  type PaperValidationInput,
  type ValidatedPaper,
} from "@/lib/paper-builder/types";

type ValidationResult =
  | { success: true; paper: ValidatedPaper }
  | { success: false; error: string };

type TemplateActionResult = { success: boolean; error?: string };
type SavePaperActionResult = { success: boolean; id?: string; error?: string };

export type SimplePaperBuilderProps = {
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  questions: PaperBuilderQuestion[];
  headerTemplates?: PaperHeaderTemplate[];
  headerTemplateActions?: {
    create: (input: PaperHeaderTemplateInput) => Promise<TemplateActionResult>;
    update: (id: string, input: PaperHeaderTemplateInput) => Promise<TemplateActionResult>;
    delete?: (id: string) => Promise<TemplateActionResult>;
    archive?: (id: string) => Promise<TemplateActionResult>;
  };
  headerTemplateManageHref?: string;
  paperTemplates?: WorkspacePaperTemplateSummary[];
  paperTemplateActions?: {
    create: (input: WorkspacePaperTemplateInput) => Promise<WorkspacePaperTemplateMutationResult>;
    update: (id: string, input: WorkspacePaperTemplateInput) => Promise<WorkspacePaperTemplateMutationResult>;
    apply: (id: string) => Promise<WorkspacePaperTemplateApplyResult>;
    duplicate: (id: string) => Promise<WorkspacePaperTemplateMutationResult>;
    archive: (id: string) => Promise<WorkspacePaperTemplateMutationResult>;
  };
  paperTemplateManageHref?: string;
  initialPaperTemplate?: WorkspacePaperTemplateSnapshot | null;
  initialPaperTemplateError?: string | null;
  validateSelection: (input: PaperValidationInput) => Promise<ValidationResult>;
  allowedQuestionTypes?: readonly BankQuestionTypeValue[];
  initialSubjectId?: string;
  defaultInstitutionName?: string;
  academicScopeDescription?: string;
  previewDescription?: string;
  teacherFriendlyLabels?: boolean;
  savePaper?: {
    action: (input: TeacherSaveGeneratedPaperInput) => Promise<SavePaperActionResult>;
    archiveHref: string;
  };
};

type PreviewTab = "questions" | "answers";
type PrintMode = "questions" | "answers" | "both";
type DocxMode = "questions" | "answers" | "both";

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

function createPattern(index: number, questionType: BankQuestionTypeValue): PaperPatternRow {
  return {
    id: `pattern-${Date.now()}-${index}`,
    label: `Section ${String.fromCharCode(64 + index)}`,
    questionType,
    questionCount: 5,
    marksPerQuestion: 1,
    difficulty: "any",
  };
}

function courseLineFor(subject: PaperBuilderSubject | undefined) {
  return subject
    ? `${subject.name} · ${subject.qualificationTitle} · ${subject.boardTitle}`
    : "";
}

export default function SimplePaperBuilderClient({
  subjects,
  topics,
  questions,
  headerTemplates = [],
  headerTemplateActions,
  headerTemplateManageHref,
  paperTemplates = [],
  paperTemplateActions,
  paperTemplateManageHref,
  initialPaperTemplate = null,
  initialPaperTemplateError = null,
  validateSelection,
  allowedQuestionTypes = PAPER_QUESTION_TYPES,
  initialSubjectId = "",
  defaultInstitutionName = initialDetails.institutionName,
  academicScopeDescription = "Choose one subject and one or more syllabus topics. Only global Vexa questions are available.",
  previewDescription = "Validated from current global Question Bank records. Nothing has been saved.",
  teacherFriendlyLabels = false,
  savePaper,
}: SimplePaperBuilderProps) {
  const router = useRouter();
  const initialSubject = subjects.find(
    (subject) => subject.id === (initialPaperTemplate?.subjectId ?? initialSubjectId),
  );
  const defaultQuestionType = allowedQuestionTypes[0] ?? "MCQ";
  const initialHeaderTemplate = initialPaperTemplate?.preferredHeaderTemplate ?? null;
  const initialTopicIds = initialPaperTemplate?.topics.map((topic) => topic.id) ?? [];
  const initialTopicLine = initialPaperTemplate?.topics.map((topic) => topic.name).join(" · ") ?? "";
  const initialPatterns = initialPaperTemplate
    ? workspacePaperTemplateRowsToPatterns(
        initialPaperTemplate.rows,
        (sortOrder) => `paper-template-${initialPaperTemplate.id}-row-${sortOrder}`,
      )
    : [createPattern(1, defaultQuestionType)];
  const [details, setDetails] = useState<PaperDetails>(() => ({
    ...initialDetails,
    institutionName: initialHeaderTemplate?.institutionName ?? defaultInstitutionName,
    examLabel: initialHeaderTemplate?.examLabel ?? initialDetails.examLabel,
    courseLine: initialHeaderTemplate?.courseLine ?? courseLineFor(initialSubject),
    topicLine: initialHeaderTemplate?.defaultTopicLine ?? initialTopicLine,
    durationMinutes: initialHeaderTemplate?.defaultDuration ?? initialDetails.durationMinutes,
    classText: initialHeaderTemplate?.defaultClassLine ?? "",
    showStudentName: initialHeaderTemplate?.showStudentName ?? initialDetails.showStudentName,
    showRollNumber: initialHeaderTemplate?.showRollNumber ?? initialDetails.showRollNumber,
    instructions: initialHeaderTemplate?.defaultInstructions ?? initialDetails.instructions,
  }));
  const [boardId, setBoardId] = useState(initialSubject?.boardId ?? "");
  const [qualificationId, setQualificationId] = useState(initialSubject?.qualificationId ?? "");
  const [subjectId, setSubjectId] = useState(initialSubject?.id ?? "");
  const [topicIds, setTopicIds] = useState<string[]>(initialTopicIds);
  const [patterns, setPatterns] = useState<PaperPatternRow[]>(initialPatterns);
  const [sections, setSections] = useState<Record<string, string[]>>({});
  const [manualPatternId, setManualPatternId] = useState<string | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [validatedPaper, setValidatedPaper] = useState<ValidatedPaper | null>(null);
  const [validatedSignature, setValidatedSignature] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("questions");
  const [validating, setValidating] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState<DocxMode | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialHeaderTemplate?.id ?? "");
  const [templateName, setTemplateName] = useState(initialHeaderTemplate?.name ?? "");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [selectedPaperTemplateId, setSelectedPaperTemplateId] = useState(
    initialPaperTemplate?.id ?? "",
  );
  const [paperTemplateName, setPaperTemplateName] = useState(initialPaperTemplate?.name ?? "");
  const [paperTemplateDescription, setPaperTemplateDescription] = useState(
    initialPaperTemplate?.description ?? "",
  );
  const [savingPaperTemplate, setSavingPaperTemplate] = useState(false);
  const [savePaperName, setSavePaperName] = useState("");
  const [savingPaper, setSavingPaper] = useState(false);
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null);

  const boards = useMemo(() => {
    const values = new Map<string, { id: string; title: string }>();
    subjects.forEach((subject) => values.set(subject.boardId, { id: subject.boardId, title: subject.boardTitle }));
    return [...values.values()];
  }, [subjects]);

  const qualifications = useMemo(() => {
    const values = new Map<string, { id: string; title: string }>();
    subjects
      .filter((subject) => subject.boardId === boardId)
      .forEach((subject) => values.set(subject.qualificationId, {
        id: subject.qualificationId,
        title: subject.qualificationTitle,
      }));
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
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );

  const eligibleByPattern = useMemo(() => {
    return new Map(
      patterns.map((pattern) => [
        pattern.id,
        uniqueEligibleQuestions(questions, subjectId, topicIds, pattern),
      ]),
    );
  }, [patterns, questions, subjectId, topicIds]);

  const selectedQuestions = useMemo(
    () => patterns.flatMap((pattern) =>
      (sections[pattern.id] ?? [])
        .map((id) => questionById.get(id))
        .filter((question): question is PaperBuilderQuestion => Boolean(question)),
    ),
    [patterns, questionById, sections],
  );
  const patternMarks = calculatePatternMarks(patterns);
  const selectedMarks = selectedQuestions.reduce((total, question) => total + question.marks, 0);
  const duplicateError = findDuplicateSelection(selectedQuestions);
  const selectionComplete = patterns.every(
    (pattern) => (sections[pattern.id]?.length ?? 0) === pattern.questionCount,
  );
  const availabilityOkay = patterns.every(
    (pattern) => (eligibleByPattern.get(pattern.id)?.length ?? 0) >= pattern.questionCount,
  );

  const validationInput: PaperValidationInput = {
    details,
    subjectId,
    topicIds,
    patterns,
    sections: patterns.map((pattern) => ({
      patternId: pattern.id,
      questionIds: sections[pattern.id] ?? [],
    })),
  };
  const currentSignature = JSON.stringify(validationInput);
  const previewIsCurrent = Boolean(validatedPaper) && validatedSignature === currentSignature;

  const canValidate =
    Boolean(details.institutionName.trim()) &&
    Boolean(details.examLabel.trim()) &&
    details.durationMinutes > 0 &&
    Boolean(subjectId) &&
    topicIds.length > 0 &&
    patterns.length > 0 &&
    patternMarks > 0 &&
    selectedMarks === patternMarks &&
    selectionComplete &&
    availabilityOkay &&
    !duplicateError;

  const invalidatePreview = () => {
    setValidatedPaper(null);
    setValidatedSignature("");
    setSavedPaperId(null);
  };

  const resetSelections = () => {
    setSections({});
    setManualPatternId(null);
    invalidatePreview();
  };

  const updateDetails = <K extends keyof PaperDetails>(key: K, value: PaperDetails[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    invalidatePreview();
  };

  const currentTemplateInput = (): PaperHeaderTemplateInput => ({
    name: templateName,
    institutionName: details.institutionName,
    examLabel: details.examLabel,
    courseLine: details.courseLine,
    defaultDuration: details.durationMinutes,
    defaultInstructions: details.instructions,
    showStudentName: details.showStudentName,
    showRollNumber: details.showRollNumber,
    defaultClassLine: details.classText || null,
    defaultTopicLine: details.topicLine || null,
  });

  const applyTemplate = () => {
    const template = headerTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) return toast.error(teacherFriendlyLabels ? "Choose a saved header first." : "Choose a header template first.");
    setTemplateName(template.name);
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
    invalidatePreview();
    toast.success(teacherFriendlyLabels ? `Using “${template.name}”. You can still edit the paper details.` : `Applied “${template.name}”. Header fields remain editable.`);
  };

  const saveTemplate = async () => {
    if (!headerTemplateActions) return;
    setSavingTemplate(true);
    try {
      const result = await headerTemplateActions.create(currentTemplateInput());
      if (!result.success) return toast.error(result.error);
      toast.success(teacherFriendlyLabels ? "Paper header saved." : "Header template saved.");
      router.refresh();
    } finally {
      setSavingTemplate(false);
    }
  };

  const updateTemplate = async () => {
    if (!headerTemplateActions) return;
    if (!selectedTemplateId) return toast.error(teacherFriendlyLabels ? "Choose a saved header to update." : "Choose a template to update.");
    setSavingTemplate(true);
    try {
      const result = await headerTemplateActions.update(selectedTemplateId, currentTemplateInput());
      if (!result.success) return toast.error(result.error);
      toast.success(teacherFriendlyLabels ? "Paper header updated." : "Header template updated.");
      router.refresh();
    } finally {
      setSavingTemplate(false);
    }
  };

  const removeTemplate = async () => {
    if (!headerTemplateActions) return;
    const template = headerTemplates.find((item) => item.id === selectedTemplateId);
    const action = headerTemplateActions.archive ?? headerTemplateActions.delete;
    const verb = headerTemplateActions.archive ? "archive" : "delete";
    if (!template || !action) return toast.error(`Choose a ${teacherFriendlyLabels ? "saved header" : "template"} to ${verb}.`);
    if (!window.confirm(`${verb === "archive" ? "Archive" : "Delete"} ${teacherFriendlyLabels ? "paper header" : "header template"} “${template.name}”?`)) return;
    setSavingTemplate(true);
    try {
      const result = await action(template.id);
      if (!result.success) return toast.error(result.error);
      setSelectedTemplateId("");
      setTemplateName("");
      toast.success(`${teacherFriendlyLabels ? "Paper header" : "Header template"} ${verb === "archive" ? "archived" : "deleted"}.`);
      router.refresh();
    } finally {
      setSavingTemplate(false);
    }
  };

  const currentPaperTemplateInput = (): WorkspacePaperTemplateInput => ({
    name: paperTemplateName,
    description: paperTemplateDescription,
    subjectId,
    topicIds,
    rows: patterns.map((pattern) => ({
      sectionLabel: pattern.label,
      questionType: pattern.questionType,
      questionCount: pattern.questionCount,
      marksPerQuestion: pattern.marksPerQuestion,
      difficulty: pattern.difficulty,
    })),
    targetMarks: patternMarks,
    preferredHeaderTemplateId: selectedTemplateId || null,
  });

  const clearGeneratedPaperState = () => {
    setSections({});
    setManualPatternId(null);
    setManualSearch("");
    setValidatedPaper(null);
    setValidatedSignature("");
    setPreviewTab("questions");
    setSavePaperName("");
    setSavedPaperId(null);
  };

  const applyPaperTemplateSnapshot = (template: WorkspacePaperTemplateSnapshot) => {
    const subject = subjects.find((item) => item.id === template.subjectId);
    if (!subject) {
      toast.error(teacherFriendlyLabels ? "This setup uses a subject that is no longer available." : "This template subject is no longer available in your workspace.");
      return;
    }
    const nextTopicIds = template.topics.map((topic) => topic.id);
    const nextTopicLine = template.topics.map((topic) => topic.name).join(" · ");
    const nextPatterns = workspacePaperTemplateRowsToPatterns(
      template.rows,
      (sortOrder) => `paper-template-${template.id}-${Date.now()}-${sortOrder}`,
    );

    setSelectedPaperTemplateId(template.id);
    setPaperTemplateName(template.name);
    setPaperTemplateDescription(template.description ?? "");
    setBoardId(subject.boardId);
    setQualificationId(subject.qualificationId);
    setSubjectId(subject.id);
    setTopicIds(nextTopicIds);
    setPatterns(nextPatterns);

    const header = template.preferredHeaderTemplate;
    if (header) {
      setSelectedTemplateId(header.id);
      setTemplateName(header.name);
      setDetails((current) => ({
        ...current,
        institutionName: header.institutionName,
        examLabel: header.examLabel,
        courseLine: header.courseLine,
        topicLine: header.defaultTopicLine ?? nextTopicLine,
        durationMinutes: header.defaultDuration,
        classText: header.defaultClassLine ?? "",
        showStudentName: header.showStudentName,
        showRollNumber: header.showRollNumber,
        instructions: header.defaultInstructions,
      }));
    } else {
      setSelectedTemplateId("");
      setTemplateName("");
      setDetails((current) => ({
        ...current,
        courseLine: courseLineFor(subject),
        topicLine: nextTopicLine,
      }));
    }
    clearGeneratedPaperState();
    toast.success(teacherFriendlyLabels ? `Using “${template.name}”. Choose fresh questions for this paper.` : `Applied “${template.name}” as a fresh paper draft.`);
  };

  const applyPaperTemplate = async () => {
    if (!paperTemplateActions || !selectedPaperTemplateId) {
      toast.error(teacherFriendlyLabels ? "Choose a saved paper setup first." : "Choose a saved paper template first.");
      return;
    }
    setSavingPaperTemplate(true);
    try {
      const result = await paperTemplateActions.apply(selectedPaperTemplateId);
      if (!result.success) return toast.error(result.error);
      applyPaperTemplateSnapshot(result.template);
    } catch {
      toast.error(teacherFriendlyLabels ? "Could not use the saved setup." : "Could not apply the paper template.");
    } finally {
      setSavingPaperTemplate(false);
    }
  };

  const saveCurrentPaperTemplate = async () => {
    if (!paperTemplateActions) return;
    setSavingPaperTemplate(true);
    try {
      const result = await paperTemplateActions.create(currentPaperTemplateInput());
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      router.refresh();
    } catch {
      toast.error(teacherFriendlyLabels ? "Could not save the paper setup." : "Could not save the paper template.");
    } finally {
      setSavingPaperTemplate(false);
    }
  };

  const updateCurrentPaperTemplate = async () => {
    if (!paperTemplateActions || !selectedPaperTemplateId) {
      toast.error(teacherFriendlyLabels ? "Choose a saved paper setup to update." : "Choose a saved paper template to update.");
      return;
    }
    setSavingPaperTemplate(true);
    try {
      const result = await paperTemplateActions.update(
        selectedPaperTemplateId,
        currentPaperTemplateInput(),
      );
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      router.refresh();
    } catch {
      toast.error(teacherFriendlyLabels ? "Could not update the paper setup." : "Could not update the paper template.");
    } finally {
      setSavingPaperTemplate(false);
    }
  };

  const duplicatePaperTemplate = async () => {
    if (!paperTemplateActions || !selectedPaperTemplateId) {
      toast.error(teacherFriendlyLabels ? "Choose a saved paper setup to duplicate." : "Choose a saved paper template to duplicate.");
      return;
    }
    setSavingPaperTemplate(true);
    try {
      const result = await paperTemplateActions.duplicate(selectedPaperTemplateId);
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      router.refresh();
    } catch {
      toast.error(teacherFriendlyLabels ? "Could not duplicate the paper setup." : "Could not duplicate the paper template.");
    } finally {
      setSavingPaperTemplate(false);
    }
  };

  const archivePaperTemplate = async () => {
    if (!paperTemplateActions || !selectedPaperTemplateId) {
      toast.error(teacherFriendlyLabels ? "Choose a saved paper setup to archive." : "Choose a saved paper template to archive.");
      return;
    }
    const selected = paperTemplates.find((template) => template.id === selectedPaperTemplateId);
    if (!selected || !window.confirm(`Archive ${teacherFriendlyLabels ? "paper setup" : "paper template"} “${selected.name}”?`)) return;
    setSavingPaperTemplate(true);
    try {
      const result = await paperTemplateActions.archive(selectedPaperTemplateId);
      if (!result.success) return toast.error(result.error);
      setSelectedPaperTemplateId("");
      setPaperTemplateName("");
      setPaperTemplateDescription("");
      toast.success(result.message);
      router.refresh();
    } catch {
      toast.error(teacherFriendlyLabels ? "Could not archive the paper setup." : "Could not archive the paper template.");
    } finally {
      setSavingPaperTemplate(false);
    }
  };

  const courseLineForSubject = (nextSubjectId: string) => {
    const subject = subjects.find((item) => item.id === nextSubjectId);
    return courseLineFor(subject);
  };

  const topicLineForIds = (nextTopicIds: string[]) =>
    availableTopics
      .filter((topic) => nextTopicIds.includes(topic.id))
      .map((topic) => topic.name)
      .join(" · ");

  const updatePattern = (patternId: string, patch: Partial<PaperPatternRow>) => {
    setPatterns((current) =>
      current.map((pattern) => (pattern.id === patternId ? { ...pattern, ...patch } : pattern)),
    );
    const changesEligibility = ["questionType", "questionCount", "marksPerQuestion", "difficulty"]
      .some((key) => key in patch);
    if (changesEligibility) {
      setSections((current) => ({ ...current, [patternId]: [] }));
    }
    invalidatePreview();
  };

  const addPattern = () => {
    setPatterns((current) => [
      ...current,
      createPattern(current.length + 1, defaultQuestionType),
    ]);
    invalidatePreview();
  };

  const removePattern = (patternId: string) => {
    setPatterns((current) => current.filter((pattern) => pattern.id !== patternId));
    setSections((current) => {
      const next = { ...current };
      delete next[patternId];
      return next;
    });
    if (manualPatternId === patternId) setManualPatternId(null);
    invalidatePreview();
  };

  const questionsUsedOutside = (
    patternId: string,
    exceptQuestionId?: string,
    excludeCurrentSection = false,
  ) => {
    const usedIds = new Set<string>();
    const usedText = new Set<string>();
    for (const pattern of patterns) {
      if (excludeCurrentSection && pattern.id === patternId) continue;
      for (const id of sections[pattern.id] ?? []) {
        if (pattern.id === patternId && id === exceptQuestionId) continue;
        const question = questionById.get(id);
        if (!question) continue;
        usedIds.add(id);
        usedText.add(normalizeQuestionText(question.questionText));
      }
    }
    return { usedIds, usedText };
  };

  const candidatesForPattern = (
    patternId: string,
    exceptQuestionId?: string,
    excludeCurrentSection = false,
  ) => {
    const { usedIds, usedText } = questionsUsedOutside(
      patternId,
      exceptQuestionId,
      excludeCurrentSection,
    );
    return (eligibleByPattern.get(patternId) ?? []).filter(
      (question) =>
        !usedIds.has(question.id) &&
        !usedText.has(normalizeQuestionText(question.questionText)),
    );
  };

  const regenerateSection = (pattern: PaperPatternRow) => {
    const candidates = candidatesForPattern(pattern.id, undefined, true);
    if (candidates.length < pattern.questionCount) {
      toast.error(`Only ${candidates.length} matching questions available for this section.`);
      return;
    }
    setSections((current) => ({
      ...current,
      [pattern.id]: shuffled(candidates).slice(0, pattern.questionCount).map((question) => question.id),
    }));
    invalidatePreview();
  };

  const generateAllRandomly = () => {
    const nextSections: Record<string, string[]> = {};
    const usedIds = new Set<string>();
    const usedText = new Set<string>();

    for (const pattern of patterns) {
      const candidates = shuffled(eligibleByPattern.get(pattern.id) ?? []).filter((question) => {
        const normalized = normalizeQuestionText(question.questionText);
        return !usedIds.has(question.id) && !usedText.has(normalized);
      });
      if (candidates.length < pattern.questionCount) {
        toast.error(`Only ${candidates.length} matching questions available for ${pattern.label}.`);
        return;
      }
      const selected = candidates.slice(0, pattern.questionCount);
      nextSections[pattern.id] = selected.map((question) => question.id);
      selected.forEach((question) => {
        usedIds.add(question.id);
        usedText.add(normalizeQuestionText(question.questionText));
      });
    }

    setSections(nextSections);
    invalidatePreview();
    toast.success("Random paper assembled. Review and replace questions as needed.");
  };

  const toggleManualQuestion = (pattern: PaperPatternRow, question: PaperBuilderQuestion) => {
    const currentIds = sections[pattern.id] ?? [];
    if (currentIds.includes(question.id)) {
      setSections((current) => ({
        ...current,
        [pattern.id]: currentIds.filter((id) => id !== question.id),
      }));
      invalidatePreview();
      return;
    }
    if (currentIds.length >= pattern.questionCount) {
      toast.error(`This section already has ${pattern.questionCount} questions.`);
      return;
    }
    const { usedIds, usedText } = questionsUsedOutside(pattern.id);
    if (usedIds.has(question.id) || usedText.has(normalizeQuestionText(question.questionText))) {
      toast.error("That question or equivalent normalized text is already used in the paper.");
      return;
    }
    setSections((current) => ({ ...current, [pattern.id]: [...currentIds, question.id] }));
    invalidatePreview();
  };

  const replaceQuestion = (pattern: PaperPatternRow, questionId: string) => {
    const currentIds = sections[pattern.id] ?? [];
    const candidates = candidatesForPattern(pattern.id, questionId).filter(
      (question) => question.id !== questionId,
    );
    if (candidates.length === 0) {
      toast.error("No unused replacement question matches this section.");
      return;
    }
    const replacement = shuffled(candidates)[0];
    setSections((current) => ({
      ...current,
      [pattern.id]: currentIds.map((id) => (id === questionId ? replacement.id : id)),
    }));
    invalidatePreview();
  };

  const removeQuestion = (patternId: string, questionId: string) => {
    setSections((current) => ({
      ...current,
      [patternId]: (current[patternId] ?? []).filter((id) => id !== questionId),
    }));
    invalidatePreview();
  };

  const moveQuestion = (patternId: string, index: number, direction: -1 | 1) => {
    const ids = [...(sections[patternId] ?? [])];
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setSections((current) => ({ ...current, [patternId]: ids }));
    invalidatePreview();
  };

  const validateAndPreview = async () => {
    setValidating(true);
    try {
      const result = await validateSelection(validationInput);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setValidatedPaper(result.paper);
      setValidatedSignature(currentSignature);
      setPreviewTab("questions");
      setSavePaperName((current) =>
        current.trim()
          ? current
          : `${teacherFriendlyLabels ? "Quick Paper" : "Paper Builder Standard"} - ${result.paper.subjectName} - ${new Date()
              .toISOString()
              .slice(0, 10)}`,
      );
      toast.success("Server validation passed. Paper is ready to preview and print.");
      requestAnimationFrame(() => document.getElementById("paper-preview")?.scrollIntoView({ behavior: "smooth" }));
    } catch {
      toast.error("Could not validate the paper. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const saveValidatedPaper = async () => {
    if (!savePaper || !previewIsCurrent) {
      toast.error("Validate the current paper before saving.");
      return;
    }
    setSavingPaper(true);
    try {
      const result = await savePaper.action({
        name: savePaperName,
        description: "",
        validationInput,
      });
      if (!result.success || !result.id) {
        toast.error(result.error ?? "Could not save the generated paper.");
        return;
      }
      setSavedPaperId(result.id);
      toast.success("Paper saved to your workspace archive.");
    } catch {
      toast.error("Could not save the generated paper. Please try again.");
    } finally {
      setSavingPaper(false);
    }
  };

  const printPaper = (mode: PrintMode) => {
    if (!previewIsCurrent) {
      toast.error("Validate the current paper before printing.");
      return;
    }
    document.documentElement.dataset.paperPrintMode = mode;
    const cleanup = () => {
      delete document.documentElement.dataset.paperPrintMode;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  };

  const downloadDocx = async (mode: DocxMode) => {
    if (!previewIsCurrent || !validatedPaper) {
      toast.error("Validate the current paper before downloading DOCX.");
      return;
    }
    setDownloadingDocx(mode);
    try {
      const { downloadPaperDocx } = await import("@/lib/paper-builder/docx");
      await downloadPaperDocx(validatedPaper, mode);
      toast.success("Editable DOCX downloaded.");
    } catch {
      toast.error("Could not generate the DOCX. Please try again.");
    } finally {
      setDownloadingDocx(null);
    }
  };

  const manualPattern = patterns.find((pattern) => pattern.id === manualPatternId) ?? null;
  const manualCandidates = manualPattern
    ? (eligibleByPattern.get(manualPattern.id) ?? []).filter((question) =>
        `${question.questionText} ${question.topicTag ?? ""}`
          .toLowerCase()
          .includes(manualSearch.trim().toLowerCase()),
      )
    : [];

  const headerTemplateButtons = headerTemplateActions ? (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}>
          {teacherFriendlyLabels ? "Save current header" : "Save current header as template"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={updateTemplate} disabled={savingTemplate || !selectedTemplateId || !templateName.trim()}>
          Update selected
        </Button>
        {(headerTemplateActions.archive || headerTemplateActions.delete) && (
          <Button type="button" size="sm" variant={headerTemplateActions.archive ? "outline" : "destructive"} onClick={removeTemplate} disabled={savingTemplate || !selectedTemplateId}>
            {headerTemplateActions.archive ? "Archive selected" : "Delete selected"}
          </Button>
        )}
        {headerTemplateManageHref && (
          <Link href={headerTemplateManageHref} className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted">
            <Settings2 className="size-4" /> {teacherFriendlyLabels ? "Manage paper headers" : "Manage templates"}
          </Link>
        )}
      </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className="paper-builder-screen-only space-y-6">
      {paperTemplateActions && (
        <SavedSetupPanel teacherFriendly={teacherFriendlyLabels}>
            {initialPaperTemplateError && <Warning message={initialPaperTemplateError} />}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-end">
              <Field label={teacherFriendlyLabels ? "Saved setup" : "Saved template"}>
                <Select
                  value={selectedPaperTemplateId}
                  onValueChange={(value) => {
                    const next = value || "";
                    const template = paperTemplates.find((item) => item.id === next);
                    setSelectedPaperTemplateId(next);
                    if (template) {
                      setPaperTemplateName(template.name);
                      setPaperTemplateDescription(template.description ?? "");
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={teacherFriendlyLabels ? "Choose a saved paper setup" : "Choose a paper template"}>
                      {paperTemplates.find((template) => template.id === selectedPaperTemplateId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paperTemplates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                        disabled={Boolean(template.staleReason)}
                      >
                        {template.name} · {template.subjectName} · {template.targetMarks} marks
                        {template.staleReason ? " · unavailable" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={teacherFriendlyLabels ? "Setup name" : "Template name"}>
                <Input
                  value={paperTemplateName}
                  onChange={(event) => setPaperTemplateName(event.target.value)}
                  maxLength={200}
                  placeholder="e.g. Class 12 SQL unit test"
                />
              </Field>
              <Button
                type="button"
                variant="outline"
                onClick={applyPaperTemplate}
                disabled={!selectedPaperTemplateId || savingPaperTemplate}
              >
                {teacherFriendlyLabels ? "Use setup" : "Apply"}
              </Button>
            </div>
            <Field label="Description (optional)">
              <Textarea
                value={paperTemplateDescription}
                onChange={(event) => setPaperTemplateDescription(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="What this reusable paper pattern is for"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={saveCurrentPaperTemplate}
                disabled={savingPaperTemplate || !paperTemplateName.trim()}
              >
                <Save className="size-4" /> {teacherFriendlyLabels ? "Save this setup" : "Save current setup"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={updateCurrentPaperTemplate}
                disabled={savingPaperTemplate || !selectedPaperTemplateId || !paperTemplateName.trim()}
              >
                Update selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={duplicatePaperTemplate}
                disabled={savingPaperTemplate || !selectedPaperTemplateId}
              >
                <Copy className="size-4" /> Duplicate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={archivePaperTemplate}
                disabled={savingPaperTemplate || !selectedPaperTemplateId}
              >
                Archive
              </Button>
              {paperTemplateManageHref && (
                <Link
                  href={paperTemplateManageHref}
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                >
                  <Settings2 className="size-4" /> {teacherFriendlyLabels ? "Manage saved setups" : "Manage paper templates"}
                </Link>
              )}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              {teacherFriendlyLabels
                ? "A saved setup reuses topics, question types and marks. It does not contain selected questions."
                : "Applying a template starts a fresh browser-session draft and clears selected questions, availability results, validation, preview, and unsaved paper state."}
            </p>
        </SavedSetupPanel>
      )}
      <Card>
        <CardHeader>
          <StepHeader step="1" title={teacherFriendlyLabels ? "Paper details" : "Paper header"} description={teacherFriendlyLabels ? "Set the heading, timing and instructions for this paper." : "Customize the printed identity, student fields, timing, and instructions."} />
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {headerTemplateActions && (
          <div className="rounded-xl border bg-muted/20 p-4 md:col-span-2 xl:col-span-4">
            <div className={cn("grid gap-3 sm:items-end", teacherFriendlyLabels ? "sm:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]")}>
              <Field label={teacherFriendlyLabels ? "Use saved header" : "Header template"}>
                <Select value={selectedTemplateId} onValueChange={(value) => { const next = value || ""; setSelectedTemplateId(next); const template = headerTemplates.find((item) => item.id === next); if (template) setTemplateName(template.name); }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a saved template">{headerTemplates.find((template) => template.id === selectedTemplateId)?.name}</SelectValue></SelectTrigger>
                  <SelectContent>{headerTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {!teacherFriendlyLabels && (
                <Field label="Template name">
                  <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={200} placeholder="e.g. Lucky International School - Class Test" />
                </Field>
              )}
              <Button type="button" variant="outline" onClick={applyTemplate} disabled={!selectedTemplateId}>{teacherFriendlyLabels ? "Use header" : "Apply template"}</Button>
            </div>
            {teacherFriendlyLabels ? (
              <details className="group mt-3 rounded-lg border bg-background/70">
                <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  Manage saved headers
                  <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="space-y-3 border-t p-3">
                  <Field label="Header name">
                    <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} maxLength={200} placeholder="e.g. Lucky International School - Class Test" />
                  </Field>
                  {headerTemplateButtons}
                </div>
              </details>
            ) : (
              <div className="mt-3">{headerTemplateButtons}</div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{teacherFriendlyLabels ? "A saved header fills school and exam details so you do not type them again." : "Templates save reusable header defaults only. The generated paper is still temporary and is never saved."}</p>
          </div>
          )}
          <Field label="Institution name" className="md:col-span-2">
            <Input value={details.institutionName} maxLength={200} onChange={(event) => updateDetails("institutionName", event.target.value)} placeholder="e.g. Lucky International School" />
          </Field>
          <Field label="Exam label">
            <Input value={details.examLabel} maxLength={200} onChange={(event) => updateDetails("examLabel", event.target.value)} placeholder="Class Test" />
          </Field>
          <Field label="Paper title (optional)">
            <Input value={details.title} maxLength={200} onChange={(event) => updateDetails("title", event.target.value)} placeholder="e.g. SQL" />
          </Field>
          <Field label="Course / class / board line" className="md:col-span-2">
            <Input value={details.courseLine} maxLength={500} onChange={(event) => updateDetails("courseLine", event.target.value)} placeholder="Filled from the selected subject" />
          </Field>
          <Field label="Topic / subtitle line (optional)" className="md:col-span-2">
            <Input value={details.topicLine} maxLength={1000} onChange={(event) => updateDetails("topicLine", event.target.value)} placeholder="Filled from selected topics" />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" min={1} max={300} value={details.durationMinutes} onChange={(event) => updateDetails("durationMinutes", Number(event.target.value))} />
          </Field>
          <Field label="Calculated maximum marks">
            <div className="flex h-10 items-center rounded-lg border bg-muted/30 px-3 text-sm font-semibold">{patternMarks}</div>
          </Field>
          <Field label="Date text">
            <Input value={details.dateText} maxLength={200} onChange={(event) => updateDetails("dateText", event.target.value)} placeholder="Leave blank for an underline" />
          </Field>
          <Field label="Class text">
            <Input value={details.classText} maxLength={200} onChange={(event) => updateDetails("classText", event.target.value)} placeholder="Leave blank for an underline" />
          </Field>
          <div className="flex flex-wrap items-center gap-6 md:col-span-2 xl:col-span-4">
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><Checkbox checked={details.showStudentName} onCheckedChange={(checked) => updateDetails("showStudentName", checked === true)} /> Show student name field</label>
            <label className="flex min-h-11 items-center gap-3 text-sm font-medium"><Checkbox checked={details.showRollNumber} onCheckedChange={(checked) => updateDetails("showRollNumber", checked === true)} /> Show roll number field</label>
          </div>
          <Field label="Instructions" className="md:col-span-2 xl:col-span-4">
            <Textarea value={details.instructions} maxLength={3000} rows={3} onChange={(event) => updateDetails("instructions", event.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <StepHeader step="2" title="Academic scope" description={academicScopeDescription} />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <FilterSelect label="Board" value={boardId} placeholder="Select board" options={boards.map((board) => ({ value: board.id, label: board.title }))} onChange={(value) => { setBoardId(value); setQualificationId(""); setSubjectId(""); setTopicIds([]); setDetails((current) => ({ ...current, courseLine: "", topicLine: "" })); resetSelections(); }} />
            <FilterSelect label="Qualification / class" value={qualificationId} placeholder="Select qualification" disabled={!boardId} options={qualifications.map((item) => ({ value: item.id, label: item.title }))} onChange={(value) => { setQualificationId(value); setSubjectId(""); setTopicIds([]); setDetails((current) => ({ ...current, courseLine: "", topicLine: "" })); resetSelections(); }} />
            <FilterSelect label="Subject" value={subjectId} placeholder="Select subject" disabled={!qualificationId} options={availableSubjects.map((subject) => ({ value: subject.id, label: subject.code ? `${subject.name} (${subject.code})` : subject.name }))} onChange={(value) => { setSubjectId(value); setTopicIds([]); setDetails((current) => ({ ...current, courseLine: courseLineForSubject(value), topicLine: "" })); resetSelections(); }} />
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Topics / chapters</Label>
              {availableTopics.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { const nextIds = topicIds.length === availableTopics.length ? [] : availableTopics.map((topic) => topic.id); setTopicIds(nextIds); setDetails((current) => ({ ...current, topicLine: topicLineForIds(nextIds) })); resetSelections(); }}>
                  {topicIds.length === availableTopics.length ? "Clear topics" : "Select all topics"}
                </Button>
              )}
            </div>
            {!subjectId ? (
              <EmptyState message="Choose a subject to load its topics." />
            ) : availableTopics.length === 0 ? (
              <EmptyState message="This subject has no topics available for Paper Builder." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {availableTopics.map((topic) => (
                  <label key={topic.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium hover:bg-muted/40">
                    <Checkbox checked={topicIds.includes(topic.id)} onCheckedChange={() => { const nextIds = topicIds.includes(topic.id) ? topicIds.filter((id) => id !== topic.id) : [...topicIds, topic.id]; setTopicIds(nextIds); setDetails((current) => ({ ...current, topicLine: topicLineForIds(nextIds) })); resetSelections(); }} />
                    {topic.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <StepHeader step="3" title={teacherFriendlyLabels ? "Paper structure" : "Paper sections"} description={teacherFriendlyLabels ? "Choose the question type, number of questions, marks and difficulty for each section." : "Define each section by question type, count, marks, and difficulty."} />
            <Button type="button" variant="outline" onClick={addPattern}><Plus className="size-4" /> Add section</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {patterns.map((pattern, index) => {
            const available = eligibleByPattern.get(pattern.id)?.length ?? 0;
            const insufficient = available < pattern.questionCount;
            return (
              <div key={pattern.id} className="rounded-2xl border bg-muted/15 p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[auto_1.15fr_1.4fr_0.8fr_0.8fr_1fr_auto] xl:items-end">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                  <Field label="Section label"><Input value={pattern.label} maxLength={100} onChange={(event) => updatePattern(pattern.id, { label: event.target.value })} /></Field>
                  <Field label="Question type"><Select value={pattern.questionType} onValueChange={(value) => updatePattern(pattern.id, { questionType: (value || defaultQuestionType) as BankQuestionTypeValue })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allowedQuestionTypes.map((type) => <SelectItem key={type} value={type}>{BANK_QUESTION_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></Field>
                  <Field label="Questions"><Input type="number" min={1} max={100} value={pattern.questionCount} onChange={(event) => updatePattern(pattern.id, { questionCount: Number(event.target.value) })} /></Field>
                  <Field label="Marks each"><Input type="number" min={1} max={100} value={pattern.marksPerQuestion} onChange={(event) => updatePattern(pattern.id, { marksPerQuestion: Number(event.target.value) })} /></Field>
                  <Field label="Difficulty"><Select value={pattern.difficulty} onValueChange={(value) => updatePattern(pattern.id, { difficulty: (value || "any") as PaperPatternRow["difficulty"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAPER_DIFFICULTIES.map((difficulty) => <SelectItem key={difficulty} value={difficulty} className="capitalize">{difficulty === "any" ? "Mixed" : difficulty}</SelectItem>)}</SelectContent></Select></Field>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${teacherFriendlyLabels ? "section" : "pattern row"} ${index + 1}`} disabled={patterns.length === 1} onClick={() => removePattern(pattern.id)}><Trash2 className="size-4" /></Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={insufficient ? "destructive" : "secondary"}>{available} {teacherFriendlyLabels ? "matching questions available" : "unique matching available"}</Badge>
                  <span className="text-muted-foreground">Section marks: {pattern.questionCount * pattern.marksPerQuestion}</span>
                  {insufficient && <span className="text-destructive">Need {pattern.questionCount - available} more matching questions.</span>}
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div><p className="font-semibold">Calculated paper total: {patternMarks} marks</p><p className="text-sm text-muted-foreground">Maximum marks always comes from section count × marks.</p></div>
            <Badge className="bg-emerald-600">{teacherFriendlyLabels ? "Total checked" : "Server recalculated"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <StepHeader step="4" title={teacherFriendlyLabels ? "Questions" : "Select questions"} description={teacherFriendlyLabels ? "Choose questions yourself or let Vexa fill each section. You can still change the result." : "Choose manually or assemble random sections, then replace, remove, or reorder individual questions."} />
            <Button type="button" onClick={generateAllRandomly} disabled={!subjectId || topicIds.length === 0 || !availabilityOkay}><Shuffle className="size-4" /> {teacherFriendlyLabels ? "Choose questions for me" : "Randomly fill all sections"}</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!subjectId || topicIds.length === 0 ? (
            <EmptyState message="Choose a subject and at least one topic before selecting questions." />
          ) : patterns.map((pattern) => {
            const ids = sections[pattern.id] ?? [];
            return (
              <section key={pattern.id} className="rounded-2xl border p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{pattern.label || "Untitled section"}</h3><p className="mt-1 text-sm text-muted-foreground">{BANK_QUESTION_TYPE_LABELS[pattern.questionType]} · {ids.length} of {pattern.questionCount} selected · {pattern.marksPerQuestion} mark{pattern.marksPerQuestion === 1 ? "" : "s"} each · {pattern.difficulty === "any" ? "mixed difficulty" : pattern.difficulty}</p></div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => { setManualPatternId(manualPatternId === pattern.id ? null : pattern.id); setManualSearch(""); }}><ListChecks className="size-4" /> {teacherFriendlyLabels ? "Choose manually" : "Manual selection"}</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => regenerateSection(pattern)}><RefreshCw className="size-4" /> {teacherFriendlyLabels ? "Choose different questions" : "Regenerate section"}</Button>
                  </div>
                </div>

                {manualPatternId === pattern.id && (
                  <div className="mt-4 rounded-xl bg-muted/35 p-4">
                    <div className="relative mb-3"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={manualSearch} onChange={(event) => setManualSearch(event.target.value)} placeholder="Search matching questions…" className="pl-9" /></div>
                    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {manualCandidates.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No matching questions.</p> : manualCandidates.map((question) => {
                        const checked = ids.includes(question.id);
                        const { usedIds, usedText } = questionsUsedOutside(pattern.id);
                        const duplicateElsewhere = !checked && (usedIds.has(question.id) || usedText.has(normalizeQuestionText(question.questionText)));
                        return (
                          <label key={question.id} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-3", duplicateElsewhere && "cursor-not-allowed opacity-50")}>
                            <Checkbox checked={checked} disabled={duplicateElsewhere} onCheckedChange={() => toggleManualQuestion(pattern, question)} />
                            <QuestionCandidateSummary question={question} />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {ids.length === 0 ? <EmptyState message="No questions selected for this section." compact /> : ids.map((id, index) => {
                    const question = questionById.get(id);
                    if (!question) return null;
                    return (
                      <div key={id} className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-start">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</div>
                        <QuestionCandidateSummary question={question} />
                        <div className="flex shrink-0 flex-wrap gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question up" disabled={index === 0} onClick={() => moveQuestion(pattern.id, index, -1)}><ArrowUp className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question down" disabled={index === ids.length - 1} onClick={() => moveQuestion(pattern.id, index, 1)}><ArrowDown className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => replaceQuestion(pattern, id)}><RefreshCw className="size-4" /> {teacherFriendlyLabels ? "Choose different question" : "Replace"}</Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => removeQuestion(pattern.id, id)}><X className="size-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><StepHeader step="5" title={teacherFriendlyLabels ? (previewIsCurrent ? "Paper ready" : "Preview, export & save") : "Validate and preview"} description={teacherFriendlyLabels ? "Check the paper, then preview, print, download or save it." : "The server rechecks authorization, ownership, scope, type-specific completeness, marks, and duplicates."} /></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusItem good={patternMarks > 0} label={`Sections total ${patternMarks} marks`} />
            <StatusItem good={selectionComplete} label={selectionComplete ? "All sections complete" : "Selections incomplete"} />
            <StatusItem good={selectedMarks === patternMarks} label={`Selected ${selectedMarks}/${patternMarks} marks`} />
            <StatusItem good={!duplicateError} label={duplicateError ?? (teacherFriendlyLabels ? "No repeated questions" : "No duplicate IDs or text")} />
          </div>
          {!availabilityOkay && <Warning message={teacherFriendlyLabels ? "At least one section does not have enough matching questions." : "At least one pattern row does not have enough matching Question Bank records."} />}
          <Button type="button" size="lg" className="h-12 w-full sm:w-auto" onClick={validateAndPreview} disabled={!canValidate || validating}><FileCheck2 className="size-5" /> {validating ? "Checking paper…" : teacherFriendlyLabels ? "Preview paper" : "Validate and open preview"}</Button>
        </CardContent>
      </Card>
      </div>

      {validatedPaper && (
        <section id="paper-preview" className="space-y-5 pt-4">
          {!previewIsCurrent && <Warning message="The builder changed after validation. Validate again before printing." />}
          <div className="paper-builder-screen-only flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-semibold">{teacherFriendlyLabels ? "Paper ready" : "Paper preview"}</h2><p className="mt-1 text-sm text-muted-foreground">{previewDescription}</p></div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={previewTab === "questions" ? "default" : "outline"} onClick={() => setPreviewTab("questions")}><Eye className="size-4" /> Student paper</Button>
              <Button type="button" variant={previewTab === "answers" ? "default" : "outline"} onClick={() => setPreviewTab("answers")}><CheckCircle2 className="size-4" /> Answer key</Button>
            </div>
          </div>
          <div className="paper-builder-screen-only flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => printPaper("questions")} disabled={!previewIsCurrent}><Printer className="size-4" /> Print question paper</Button>
            <Button type="button" variant="outline" onClick={() => printPaper("answers")} disabled={!previewIsCurrent}><Printer className="size-4" /> Print answer key</Button>
            <Button type="button" onClick={() => printPaper("both")} disabled={!previewIsCurrent}><Printer className="size-4" /> Print both</Button>
          </div>
          <div className="paper-builder-screen-only flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => downloadDocx("questions")} disabled={!previewIsCurrent || downloadingDocx !== null}><FileDown className="size-4" /> {downloadingDocx === "questions" ? "Generating…" : "Download Question Paper DOCX"}</Button>
            <Button type="button" variant="outline" onClick={() => downloadDocx("answers")} disabled={!previewIsCurrent || downloadingDocx !== null}><FileDown className="size-4" /> {downloadingDocx === "answers" ? "Generating…" : "Download Answer Key DOCX"}</Button>
            <Button type="button" variant="outline" onClick={() => downloadDocx("both")} disabled={!previewIsCurrent || downloadingDocx !== null}><FileDown className="size-4" /> {downloadingDocx === "both" ? "Generating…" : "Download Both DOCX"}</Button>
          </div>
          {savePaper && (
            <div className="paper-builder-screen-only rounded-2xl border bg-card p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <Field label="Saved paper title" className="min-w-0 flex-1">
                  <Input
                    value={savePaperName}
                    maxLength={200}
                    onChange={(event) => setSavePaperName(event.target.value)}
                    placeholder={`${teacherFriendlyLabels ? "Quick Paper" : "Paper Builder Standard"} - ${validatedPaper.subjectName} - YYYY-MM-DD`}
                  />
                </Field>
                <Button
                  type="button"
                  disabled={!previewIsCurrent || savingPaper}
                  onClick={saveValidatedPaper}
                >
                  <Save className="size-4" />
                  {savingPaper ? "Saving…" : "Save Paper"}
                </Button>
                <a
                  href={
                    savedPaperId
                      ? `${savePaper.archiveHref}/${savedPaperId}`
                      : savePaper.archiveHref
                  }
                  className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted"
                >
                  {teacherFriendlyLabels ? "Open saved papers" : "Open Paper Archive"}
                </a>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {teacherFriendlyLabels ? "Saving keeps this exact paper for later. It does not assign the paper to students." : "Saving creates an immutable workspace-owned snapshot. It does not assign or publish the paper."}
              </p>
            </div>
          )}
          <div className={cn(previewTab !== "questions" && "paper-builder-preview-hidden")}><PaperQuestionDocument paper={validatedPaper} /></div>
          <div className={cn(previewTab !== "answers" && "paper-builder-preview-hidden")}><PaperAnswerKeyDocument paper={validatedPaper} /></div>
        </section>
      )}
    </div>
  );
}

function QuestionCandidateSummary({ question }: { question: PaperBuilderQuestion }) {
  const showsOptions = question.questionType === "MCQ" || question.questionType === "ASSERTION_REASON";
  const options = [question.optionA, question.optionB, question.optionC, question.optionD];

  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{BANK_QUESTION_TYPE_LABELS[question.questionType]}</Badge>
        {question.imageUrl && <Badge variant="secondary"><ImageIcon className="size-3" /> Has image</Badge>}
        <span className="text-xs text-muted-foreground">{question.difficulty} · {question.marks} mark{question.marks === 1 ? "" : "s"}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-6">{question.questionText}</p>
      {showsOptions && (
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {options.map((option, index) => <span key={index}>{String.fromCharCode(65 + index)}. {option}</span>)}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{question.topicName ?? question.topicTag ?? "Topic"}</p>
    </div>
  );
}

function SavedSetupPanel({
  teacherFriendly,
  children,
}: {
  teacherFriendly: boolean;
  children: React.ReactNode;
}) {
  if (teacherFriendly) {
    return (
      <details className="group rounded-2xl border bg-card">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
          <span>
            <span className="block text-sm font-semibold">Use a saved paper setup</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Reuse topics, question types and marks from a previous Quick Paper.
            </span>
          </span>
          <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180">
            ⌄
          </span>
        </summary>
        <div className="space-y-4 border-t p-4 sm:p-5">{children}</div>
      </details>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved paper templates</CardTitle>
        <CardDescription>
          Reuse academic scope and section rules. Templates never save selected or generated questions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function StepHeader({ step, title, description }: { step: string; title: string; description: string }) {
  return <div className="flex items-start gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{step}</div><div><CardTitle>{title}</CardTitle><CardDescription className="mt-1 leading-6">{description}</CardDescription></div></div>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}><Label>{label}</Label>{children}</div>;
}

function FilterSelect({ label, value, options, onChange, placeholder, disabled }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (value: string) => void; placeholder: string; disabled?: boolean }) {
  return <Field label={label}><Select value={value} onValueChange={(next) => onChange(next || "")} disabled={disabled}><SelectTrigger className="w-full"><SelectValue placeholder={placeholder}>{options.find((option) => option.value === value)?.label}</SelectValue></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field>;
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return <div className={cn("rounded-xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground", compact ? "py-6" : "py-10")}>{message}</div>;
}

function StatusItem({ good, label }: { good: boolean; label: string }) {
  return <div className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium", good ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200")}>{good ? <CheckCircle2 className="size-4 shrink-0" /> : <CircleAlert className="size-4 shrink-0" />}<span className="line-clamp-2">{label}</span></div>;
}

function Warning({ message }: { message: string }) {
  return <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>;
}
