"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileDown,
  FileCheck2,
  ImageIcon,
  Plus,
  Printer,
  RefreshCw,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PaperAnswerKeyDocument, PaperQuestionDocument } from "@/components/paper-builder/PaperBuilderDocuments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BANK_QUESTION_TYPE_LABELS, type BankQuestionTypeValue } from "@/lib/bank-questions";
import {
  calculateBlueprintChapterMarks,
  calculateBlueprintPaperMarks,
} from "@/lib/paper-builder/blueprint-rules";
import type {
  BlueprintAvailability,
  BlueprintChapterDraft,
  BlueprintGeneratedRow,
  BlueprintGenerationResult,
  BlueprintPaperDraft,
  BlueprintRowDraft,
} from "@/lib/paper-builder/blueprint-types";
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

import {
  generateBlueprintPaper,
  reviewBlueprintAvailability,
  validateBlueprintSelection,
} from "./actions";

type Props = {
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  headerTemplates: PaperHeaderTemplate[];
};

type PrintMode = "questions" | "answers" | "both";
type DocxMode = PrintMode;
type PreviewTab = "questions" | "answers";

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

export default function BlueprintBuilderClient({ subjects, topics, headerTemplates }: Props) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState<PaperDetails>(initialDetails);
  const [targetMarksText, setTargetMarksText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [boardId, setBoardId] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [chapters, setChapters] = useState<BlueprintChapterDraft[]>([]);
  const [availability, setAvailability] = useState<BlueprintAvailability[]>([]);
  const [rowErrors, setRowErrors] = useState<Array<{ rowId: string; message: string }>>([]);
  const [generatedRows, setGeneratedRows] = useState<BlueprintGeneratedRow[]>([]);
  const [validatedPaper, setValidatedPaper] = useState<ValidatedPaper | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState<DocxMode | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("questions");

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
  const totalMarks = calculateBlueprintPaperMarks(chapters);
  const targetMarks = targetMarksText.trim() ? Number(targetMarksText) : null;
  const availabilityByRow = useMemo(
    () => new Map(availability.map((item) => [item.rowId, item])),
    [availability],
  );
  const errorsByRow = useMemo(() => new Map(rowErrors.map((item) => [item.rowId, item.message])), [rowErrors]);
  const selectedCount = generatedRows.reduce((total, row) => total + row.questions.length, 0);
  const requestedCount = chapters.flatMap((chapter) => chapter.rows).reduce((total, row) => total + row.questionCount, 0);
  const selectionsComplete = generatedRows.length > 0 && generatedRows.every((row) => row.questions.length === row.questionCount);

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
  };

  const updateDetails = <K extends keyof PaperDetails>(key: K, value: PaperDetails[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setValidatedPaper(null);
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
    toast.success(`Applied “${template.name}”.`);
  };

  const resetAcademicScope = () => {
    setChapters([]);
    clearGenerated();
    setDetails((current) => ({ ...current, courseLine: "", topicLine: "" }));
  };

  const selectSubject = (nextSubjectId: string) => {
    const subject = subjects.find((item) => item.id === nextSubjectId);
    setSubjectId(nextSubjectId);
    setChapters([]);
    clearGenerated();
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
  };

  const updateRow = (chapterId: string, rowId: string, patch: Partial<BlueprintRowDraft>) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: chapter.rows.map((row) => row.id === rowId ? { ...row, ...patch } : row) }
      : chapter));
    clearGenerated();
  };

  const addRow = (chapterId: string) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: [...chapter.rows, createRow(chapter.topicId, chapter.rows.length + 1)] }
      : chapter));
    clearGenerated();
  };

  const removeRow = (chapterId: string, rowId: string) => {
    setChapters((current) => current.map((chapter) => chapter.id === chapterId
      ? { ...chapter, rows: chapter.rows.filter((row) => row.id !== rowId) }
      : chapter));
    clearGenerated();
  };

  const reviewAvailability = async () => {
    setReviewing(true);
    try {
      const result = await reviewBlueprintAvailability(draft);
      if (!result.success) return toast.error(result.error);
      setAvailability(result.availability);
      setRowErrors([]);
      setStep(4);
      toast.success("Availability checked against the current global Question Bank.");
    } finally {
      setReviewing(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generateBlueprintPaper(draft);
      if (!result.success) {
        setRowErrors(result.rowErrors);
        toast.error(result.error);
        return;
      }
      applyGeneration(result.result);
      setStep(5);
      toast.success("Complete paper generated. Review the chapter allocations before previewing.");
    } finally {
      setGenerating(false);
    }
  };

  const applyGeneration = (result: BlueprintGenerationResult) => {
    setGeneratedRows(result.rows);
    setValidatedPaper(result.paper);
    setRowErrors([]);
  };

  const updateGeneratedRow = (rowId: string, updater: (questions: PaperBuilderQuestion[]) => PaperBuilderQuestion[]) => {
    setGeneratedRows((current) => current.map((row) => row.id === rowId ? { ...row, questions: updater(row.questions) } : row));
    setValidatedPaper(null);
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

  const validateReview = async () => {
    setValidating(true);
    try {
      const result = await validateBlueprintSelection(draft, generatedRows.map((row) => ({
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

  const printPaper = (mode: PrintMode) => {
    if (!validatedPaper) return toast.error("Validate the current blueprint before printing.");
    document.documentElement.dataset.paperPrintMode = mode;
    const cleanup = () => {
      delete document.documentElement.dataset.paperPrintMode;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  };

  const downloadDocx = async (mode: DocxMode) => {
    if (!validatedPaper) return toast.error("Validate the current blueprint before downloading DOCX.");
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
      <WizardProgress step={step} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="min-w-0">
          {step === 1 && (
            <PaperDetailsStep
              details={details}
              targetMarksText={targetMarksText}
              templates={headerTemplates}
              selectedTemplateId={selectedTemplateId}
              onTemplateChange={setSelectedTemplateId}
              onApplyTemplate={applyTemplate}
              onDetailsChange={updateDetails}
              onTargetMarksChange={(value) => { setTargetMarksText(value); clearGenerated(); }}
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
              rows={generatedRows}
              requestedCount={requestedCount}
              selectedCount={selectedCount}
              onMove={moveQuestion}
              onRemove={(rowId, questionId) => updateGeneratedRow(rowId, (questions) => questions.filter((question) => question.id !== questionId))}
              onRegenerate={generate}
              generating={generating}
            />
          )}

          {step === 6 && validatedPaper && (
            <PreviewStep
              paper={validatedPaper}
              previewTab={previewTab}
              downloadingDocx={downloadingDocx}
              onPreviewTab={setPreviewTab}
              onPrint={printPaper}
              onDownload={downloadDocx}
            />
          )}
        </div>

        <BlueprintSummary chapters={chapters} targetMarks={targetMarks} availability={availability} selectedCount={selectedCount} requestedCount={requestedCount} />
      </div>

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

function GeneratedReviewStep({ rows, requestedCount, selectedCount, onMove, onRemove, onRegenerate, generating }: {
  rows: BlueprintGeneratedRow[];
  requestedCount: number;
  selectedCount: number;
  onMove: (rowId: string, index: number, direction: -1 | 1) => void;
  onRemove: (rowId: string, questionId: string) => void;
  onRegenerate: () => void;
  generating: boolean;
}) {
  const chapters = new Map<string, BlueprintGeneratedRow[]>();
  rows.forEach((row) => chapters.set(row.topicName, [...(chapters.get(row.topicName) ?? []), row]));
  return (
    <Card>
      <CardHeader><div className="flex flex-wrap items-start justify-between gap-4"><StepHeading number="5" title="Generated paper review" description="Questions are grouped by their exact blueprint chapter and row. Reordering stays within a row." /><Button type="button" variant="outline" onClick={onRegenerate} disabled={generating}><Shuffle className="size-4" /> {generating ? "Regenerating…" : "Regenerate whole paper"}</Button></div></CardHeader>
      <CardContent className="space-y-5">
        <StatusBanner good={selectedCount === requestedCount} message={`${selectedCount} of ${requestedCount} requested questions selected`} />
        {[...chapters.entries()].map(([topicName, chapterRows]) => (
          <section key={topicName} className="rounded-2xl border p-4 sm:p-5">
            <h3 className="font-semibold">{topicName}</h3>
            <div className="mt-4 space-y-5">
              {chapterRows.map((row) => (
                <div key={row.id}>
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{row.sectionLabel} · {BANK_QUESTION_TYPE_LABELS[row.questionType]}</p><Badge variant={row.questions.length === row.questionCount ? "secondary" : "destructive"}>{row.questions.length}/{row.questionCount}</Badge></div>
                  <div className="mt-2 space-y-2">
                    {row.questions.map((question, index) => (
                      <div key={question.id} className="flex flex-col gap-3 rounded-xl border bg-muted/15 p-3 sm:flex-row sm:items-start">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                        <QuestionSummary question={question} />
                        <div className="flex shrink-0 gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question up" disabled={index === 0} onClick={() => onMove(row.id, index, -1)}><ArrowUp className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Move question down" disabled={index === row.questions.length - 1} onClick={() => onMove(row.id, index, 1)}><ArrowDown className="size-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label="Remove question" onClick={() => onRemove(row.id, question.id)}><X className="size-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function PreviewStep({ paper, previewTab, downloadingDocx, onPreviewTab, onPrint, onDownload }: {
  paper: ValidatedPaper;
  previewTab: PreviewTab;
  downloadingDocx: DocxMode | null;
  onPreviewTab: (tab: PreviewTab) => void;
  onPrint: (mode: PrintMode) => void;
  onDownload: (mode: DocxMode) => void;
}) {
  return (
    <section id="blueprint-paper-preview" className="space-y-5">
      <div className="paper-builder-screen-only flex flex-col gap-4 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-semibold">Blueprint paper output</h2><p className="mt-1 text-sm text-muted-foreground">Server-validated and still browser-session-only.</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant={previewTab === "questions" ? "default" : "outline"} onClick={() => onPreviewTab("questions")}><Eye className="size-4" /> Student paper</Button><Button type="button" variant={previewTab === "answers" ? "default" : "outline"} onClick={() => onPreviewTab("answers")}><CheckCircle2 className="size-4" /> Answer key</Button></div>
      </div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => onPrint("questions")}><Printer className="size-4" /> Print question paper</Button><Button type="button" variant="outline" onClick={() => onPrint("answers")}><Printer className="size-4" /> Print answer key</Button><Button type="button" onClick={() => onPrint("both")}><Printer className="size-4" /> Print both</Button></div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("questions")}><FileDown className="size-4" /> {downloadingDocx === "questions" ? "Generating…" : "Download Question Paper DOCX"}</Button><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("answers")}><FileDown className="size-4" /> {downloadingDocx === "answers" ? "Generating…" : "Download Answer Key DOCX"}</Button><Button type="button" variant="outline" disabled={downloadingDocx !== null} onClick={() => onDownload("both")}><FileDown className="size-4" /> {downloadingDocx === "both" ? "Generating…" : "Download Both DOCX"}</Button></div>
      <div className={cn(previewTab !== "questions" && "paper-builder-preview-hidden")}><PaperQuestionDocument paper={paper} /></div>
      <div className={cn(previewTab !== "answers" && "paper-builder-preview-hidden")}><PaperAnswerKeyDocument paper={paper} /></div>
    </section>
  );
}

function BlueprintSummary({ chapters, targetMarks, availability, selectedCount, requestedCount }: { chapters: BlueprintChapterDraft[]; targetMarks: number | null; availability: BlueprintAvailability[]; selectedCount: number; requestedCount: number }) {
  const total = calculateBlueprintPaperMarks(chapters);
  const insufficient = availability.filter((item) => item.status === "insufficient").length;
  return (
    <aside className="paper-builder-screen-only space-y-4 rounded-2xl border bg-card p-4 xl:sticky xl:top-6">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Blueprint summary</p><p className="mt-2 text-2xl font-bold">{total} marks</p>{targetMarks !== null && <p className={cn("mt-1 text-sm", targetMarks === total ? "text-emerald-600" : "text-destructive")}>Target: {targetMarks} marks</p>}</div>
      <div className="space-y-2 text-sm"><SummaryRow label="Chapters" value={chapters.length} /><SummaryRow label="Rows" value={chapters.flatMap((chapter) => chapter.rows).length} /><SummaryRow label="Questions" value={requestedCount} />{selectedCount > 0 && <SummaryRow label="Selected" value={selectedCount} />}</div>
      {availability.length > 0 && <StatusBanner good={insufficient === 0} message={insufficient === 0 ? "All rows have sufficient availability" : `${insufficient} row${insufficient === 1 ? "" : "s"} need attention`} />}
      <p className="text-xs leading-5 text-muted-foreground">Blueprints and generated papers are not saved to the database.</p>
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
  return <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{BANK_QUESTION_TYPE_LABELS[question.questionType]}</Badge>{question.imageUrl && <Badge variant="secondary"><ImageIcon className="size-3" /> Has image</Badge>}<span className="text-xs text-muted-foreground">{question.difficulty} · {question.marks} mark{question.marks === 1 ? "" : "s"}</span></div><p className="mt-2 text-sm font-medium leading-6">{question.questionText}</p></div>;
}
