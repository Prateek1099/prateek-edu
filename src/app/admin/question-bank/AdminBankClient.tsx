"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Eye, EyeOff, FileSpreadsheet, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { appendBankQuestions, deleteBankQuestion } from "@/app/actions/admin";
import {
  createAdminBankQuestion,
  importAdminBankQuestionCsv,
  updateAdminBankQuestion,
} from "@/app/admin/question-bank/actions";
import { useAdminBoard } from "@/components/AdminBoardContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseBankQuestionCsv, type BankQuestionCsvResult } from "@/lib/bank-question-csv";
import {
  BANK_QUESTION_DIFFICULTIES,
  BANK_QUESTION_TYPES,
  BANK_QUESTION_TYPE_LABELS,
  type BankQuestionInput,
  type BankQuestionTypeValue,
} from "@/lib/bank-questions";
import { parseQuestions, type ParseResult } from "@/lib/parseQuestions";
import { cn } from "@/lib/utils";

type SubjectOption = {
  id: string;
  name: string;
  label: string;
  board: string;
  boardId: string;
  boardTitle: string;
  qualificationId: string;
  qualificationTitle: string;
};
type TopicOption = { id: string; label: string; subjectId: string };

type BankQuestion = {
  id: string;
  subjectId: string;
  topicId: string | null;
  questionType: BankQuestionTypeValue;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  modelAnswer: string | null;
  explanation: string | null;
  source: string | null;
  difficulty: string;
  marks: number;
  topicTag: string | null;
  workspaceId: string | null;
  subject: { name: string; qualification: { board: { name: string } } };
  topic: { topicName: string } | null;
};

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300",
};

const emptyForm: BankQuestionInput = {
  subjectId: "",
  topicId: null,
  questionType: "MCQ",
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  modelAnswer: "",
  explanation: "",
  source: "",
  topicTag: "",
  difficulty: "medium",
  marks: 1,
};

export default function AdminBankClient({
  initialQuestions,
  subjectOptions,
  topicOptions,
}: {
  initialQuestions: BankQuestion[];
  subjectOptions: SubjectOption[];
  topicOptions: TopicOption[];
}) {
  const { selectedBoard } = useAdminBoard();
  const [questions, setQuestions] = useState(initialQuestions);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState<BankQuestion | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);

  const filteredSubjectOptions = useMemo(
    () => selectedBoard === "all" ? subjectOptions : subjectOptions.filter((subject) => subject.board === selectedBoard),
    [selectedBoard, subjectOptions],
  );
  const filteredTopics = useMemo(
    () => subjectFilter === "all" ? [] : topicOptions.filter((topic) => topic.subjectId === subjectFilter),
    [subjectFilter, topicOptions],
  );
  const sources = useMemo(
    () => [...new Set(questions.map((question) => question.source).filter((source): source is string => Boolean(source)))].sort(),
    [questions],
  );
  const filteredQuestions = useMemo(() => questions.filter((question) => {
    if (selectedBoard !== "all" && question.subject.qualification.board.name !== selectedBoard) return false;
    if (subjectFilter !== "all" && question.subjectId !== subjectFilter) return false;
    if (topicFilter !== "all" && question.topicId !== topicFilter) return false;
    if (difficultyFilter !== "all" && question.difficulty !== difficultyFilter) return false;
    if (typeFilter !== "all" && question.questionType !== typeFilter) return false;
    if (sourceFilter !== "all" && question.source !== sourceFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    return !query || `${question.questionText} ${question.topicTag ?? ""} ${question.source ?? ""}`.toLowerCase().includes(query);
  }), [difficultyFilter, questions, searchQuery, selectedBoard, sourceFilter, subjectFilter, topicFilter, typeFilter]);

  const handleDelete = async (question: BankQuestion) => {
    if (!confirm(`Delete “${question.questionText.slice(0, 80)}”? This cannot be undone.`)) return;
    const result = await deleteBankQuestion(question.id);
    if (!result.success) return toast.error(result.error || "Failed to delete question.");
    setQuestions((current) => current.filter((item) => item.id !== question.id));
    toast.success("Question deleted.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{filteredQuestions.length} of {questions.length} questions</p>
            <p className="text-xs text-muted-foreground">Mixed types are stored here; existing interactive systems remain MCQ-only.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="size-4" /> Import questions</Button>
            <Button onClick={() => setFormQuestion(null)}><Plus className="size-4" /> Add question</Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Input placeholder="Search text, tag, or source…" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="xl:col-span-2" />
          <Filter value={subjectFilter} label="Subject" options={[{ value: "all", label: "All subjects" }, ...filteredSubjectOptions.map((subject) => ({ value: subject.id, label: subject.label }))]} onChange={(value) => { setSubjectFilter(value); setTopicFilter("all"); }} />
          <Filter value={topicFilter} label="Topic" disabled={subjectFilter === "all"} options={[{ value: "all", label: "All topics" }, ...filteredTopics.map((topic) => ({ value: topic.id, label: topic.label }))]} onChange={setTopicFilter} />
          <Filter value={typeFilter} label="Question type" options={[{ value: "all", label: "All types" }, ...BANK_QUESTION_TYPES.map((type) => ({ value: type, label: BANK_QUESTION_TYPE_LABELS[type] }))]} onChange={setTypeFilter} />
          <Filter value={difficultyFilter} label="Difficulty" options={[{ value: "all", label: "All difficulties" }, ...BANK_QUESTION_DIFFICULTIES.map((difficulty) => ({ value: difficulty, label: difficulty }))]} onChange={setDifficultyFilter} />
          {sources.length > 0 && <Filter value={sourceFilter} label="Source" options={[{ value: "all", label: "All sources" }, ...sources.map((source) => ({ value: source, label: source }))]} onChange={setSourceFilter} />}
        </div>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead className="min-w-80">Question</TableHead><TableHead>Type</TableHead><TableHead>Academic scope</TableHead><TableHead>Difficulty / marks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredQuestions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No questions match these filters.</TableCell></TableRow>
              ) : filteredQuestions.map((question) => {
                const expanded = expandedQuestionId === question.id;
                return (
                  <TableRow key={question.id}>
                    <TableCell className="align-top">
                      <p className={cn("font-medium leading-6", !expanded && "line-clamp-2")}>{question.questionText}</p>
                      {expanded && <QuestionPreview question={question} />}
                    </TableCell>
                    <TableCell className="align-top"><Badge variant="outline">{BANK_QUESTION_TYPE_LABELS[question.questionType]}</Badge>{question.source && <p className="mt-2 max-w-40 text-xs text-muted-foreground">{question.source}</p>}</TableCell>
                    <TableCell className="align-top"><p className="text-sm font-medium">{question.subject.name}</p><p className="text-xs text-muted-foreground">{question.topic?.topicName ?? "No topic"}</p>{question.topicTag && <Badge variant="secondary" className="mt-2">{question.topicTag}</Badge>}</TableCell>
                    <TableCell className="align-top"><div className="flex flex-wrap gap-2"><Badge variant="outline" className={cn("capitalize", difficultyColor[question.difficulty])}>{question.difficulty}</Badge><Badge variant="secondary">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge></div></TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={expanded ? "Hide preview" : "Preview question"} onClick={() => setExpandedQuestionId(expanded ? null : question.id)}>{expanded ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
                        {question.workspaceId === null && <Button variant="ghost" size="icon" aria-label="Edit question" onClick={() => setFormQuestion(question)}><Pencil className="size-4" /></Button>}
                        <Button variant="ghost" size="icon" aria-label="Delete question" className="text-destructive" onClick={() => handleDelete(question)}><Trash2 className="size-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <QuestionFormDialog key={formQuestion?.id ?? (formQuestion === null ? "new" : "closed")} open={formQuestion !== undefined} question={formQuestion ?? null} subjects={filteredSubjectOptions} topics={topicOptions} onClose={() => setFormQuestion(undefined)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} subjects={filteredSubjectOptions} topics={topicOptions} />
    </div>
  );
}

function QuestionPreview({ question }: { question: BankQuestion }) {
  const optionType = question.questionType === "MCQ" || question.questionType === "ASSERTION_REASON";
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-muted/35 p-4 text-sm">
      {optionType && <div className="grid gap-2 sm:grid-cols-2">{[["A", question.optionA], ["B", question.optionB], ["C", question.optionC], ["D", question.optionD]].map(([letter, value]) => <div key={letter} className={cn("rounded-lg bg-background px-3 py-2", question.correctAnswer === letter && "ring-1 ring-emerald-500 text-emerald-700 dark:text-emerald-300")}><strong>{letter}.</strong> {value}</div>)}</div>}
      {question.correctAnswer && <p><strong>Canonical answer:</strong> {question.correctAnswer}</p>}
      {question.modelAnswer && <p className="whitespace-pre-wrap leading-6"><strong>Model answer:</strong> {question.modelAnswer}</p>}
      {question.explanation && <p className="whitespace-pre-wrap leading-6 text-muted-foreground"><strong className="text-foreground">Explanation:</strong> {question.explanation}</p>}
    </div>
  );
}

function QuestionFormDialog({ open, question, subjects, topics, onClose }: { open: boolean; question: BankQuestion | null; subjects: SubjectOption[]; topics: TopicOption[]; onClose: () => void }) {
  const initialSubject = subjects.find((subject) => subject.id === question?.subjectId);
  const [boardId, setBoardId] = useState(initialSubject?.boardId ?? "");
  const [qualificationId, setQualificationId] = useState(initialSubject?.qualificationId ?? "");
  const [form, setForm] = useState<BankQuestionInput>(question ? {
    subjectId: question.subjectId, topicId: question.topicId, questionType: question.questionType, questionText: question.questionText,
    optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD,
    correctAnswer: question.correctAnswer, modelAnswer: question.modelAnswer, explanation: question.explanation,
    source: question.source, topicTag: question.topicTag, difficulty: question.difficulty, marks: question.marks,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const boards = [...new Map(subjects.map((subject) => [subject.boardId, { value: subject.boardId, label: subject.boardTitle }])).values()];
  const qualifications = [...new Map(subjects.filter((subject) => subject.boardId === boardId).map((subject) => [subject.qualificationId, { value: subject.qualificationId, label: subject.qualificationTitle }])).values()];
  const availableSubjects = subjects.filter((subject) => subject.qualificationId === qualificationId);
  const availableTopics = topics.filter((topic) => topic.subjectId === form.subjectId);
  const optionType = form.questionType === "MCQ" || form.questionType === "ASSERTION_REASON";
  const writtenType = ["VERY_SHORT_ANSWER", "SHORT_ANSWER", "LONG_ANSWER"].includes(form.questionType);
  const set = <K extends keyof BankQuestionInput>(key: K, value: BankQuestionInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = question ? await updateAdminBankQuestion(question.id, form) : await createAdminBankQuestion(form);
      if (!result.success) return toast.error(result.error);
      toast.success(question ? "Question updated." : "Question added.");
      onClose();
      window.location.reload();
    } catch { toast.error("Could not save the question."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader><DialogTitle>{question ? "Edit question" : "Add question"}</DialogTitle><DialogDescription>Marks are flexible and are not hard-coded by question type. Choose the value appropriate for your assessment.</DialogDescription></DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Board"><Filter value={boardId} label="Board" options={boards} onChange={(value) => { setBoardId(value); setQualificationId(""); set("subjectId", ""); set("topicId", null); }} /></Field>
          <Field label="Qualification / class"><Filter value={qualificationId} label="Qualification" disabled={!boardId} options={qualifications} onChange={(value) => { setQualificationId(value); set("subjectId", ""); set("topicId", null); }} /></Field>
          <Field label="Subject"><Filter value={form.subjectId} label="Subject" disabled={!qualificationId} options={availableSubjects.map((subject) => ({ value: subject.id, label: subject.name }))} onChange={(value) => { set("subjectId", value); set("topicId", null); }} /></Field>
          <Field label="Topic"><Filter value={form.topicId ?? ""} label="Topic" disabled={!form.subjectId} options={availableTopics.map((topic) => ({ value: topic.id, label: topic.label }))} onChange={(value) => set("topicId", value || null)} /></Field>
          <Field label="Question type"><Filter value={form.questionType} label="Question type" options={BANK_QUESTION_TYPES.map((type) => ({ value: type, label: BANK_QUESTION_TYPE_LABELS[type] }))} onChange={(value) => set("questionType", value as BankQuestionTypeValue)} /></Field>
          <Field label="Difficulty"><Filter value={form.difficulty} label="Difficulty" options={BANK_QUESTION_DIFFICULTIES.map((value) => ({ value, label: value }))} onChange={(value) => set("difficulty", value)} /></Field>
          <Field label="Marks"><Input type="number" min={1} max={1000} value={form.marks} onChange={(event) => set("marks", Number(event.target.value))} /></Field>
          <Field label="Source"><Input value={form.source ?? ""} maxLength={2000} onChange={(event) => set("source", event.target.value)} placeholder="Textbook, exam, ERP, teacher…" /></Field>
          <Field label="Topic tag"><Input value={form.topicTag ?? ""} maxLength={500} onChange={(event) => set("topicTag", event.target.value)} placeholder="Optional granular tag" /></Field>
          <Field label="Question" className="sm:col-span-2"><Textarea rows={5} value={form.questionText} onChange={(event) => set("questionText", event.target.value)} placeholder={form.questionType === "ASSERTION_REASON" ? "Enter the assertion and reason statements…" : "Enter the question…"} /></Field>
          {optionType && (["optionA", "optionB", "optionC", "optionD"] as const).map((key) => <Field key={key} label={`Option ${key.slice(-1)}`}><Textarea rows={2} value={form[key] ?? ""} onChange={(event) => set(key, event.target.value)} /></Field>)}
          {optionType && <Field label="Correct option"><Filter value={form.correctAnswer ?? "A"} label="Correct option" options={["A", "B", "C", "D"].map((value) => ({ value, label: value }))} onChange={(value) => set("correctAnswer", value)} /></Field>}
          {form.questionType === "TRUE_FALSE" && <Field label="Answer"><Filter value={form.correctAnswer ?? "TRUE"} label="Answer" options={[{ value: "TRUE", label: "True" }, { value: "FALSE", label: "False" }]} onChange={(value) => set("correctAnswer", value)} /></Field>}
          {form.questionType === "FILL_BLANK" && <Field label="Canonical answer"><Input value={form.correctAnswer ?? ""} onChange={(event) => set("correctAnswer", event.target.value)} /></Field>}
          {writtenType && <Field label="Model answer / marking guidance" className="sm:col-span-2"><Textarea rows={7} value={form.modelAnswer ?? ""} onChange={(event) => set("modelAnswer", event.target.value)} placeholder={form.questionType === "LONG_ANSWER" ? "Enter a model answer or marking rubric…" : "Enter the expected answer or marking points…"} /></Field>}
          <Field label="Explanation" className="sm:col-span-2"><Textarea rows={4} value={form.explanation ?? ""} onChange={(event) => set("explanation", event.target.value)} placeholder="Optional teaching explanation or reasoning" /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : question ? "Save changes" : "Add question"}</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ open, onClose, subjects, topics }: { open: boolean; onClose: () => void; subjects: SubjectOption[]; topics: TopicOption[] }) {
  const [subjectId, setSubjectId] = useState("");
  const [legacyTopicId, setLegacyTopicId] = useState("none");
  const [legacyText, setLegacyText] = useState("");
  const [legacyResult, setLegacyResult] = useState<ParseResult | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvResult, setCsvResult] = useState<BankQuestionCsvResult | null>(null);
  const [importing, setImporting] = useState(false);
  const availableTopics = topics.filter((topic) => topic.subjectId === subjectId);

  const parseCsv = () => setCsvResult(parseBankQuestionCsv(csvText, subjectId, topics.map((topic) => ({ id: topic.id, subjectId: topic.subjectId, name: topic.label }))));
  const importLegacy = async () => {
    if (!subjectId || !legacyResult || legacyResult.errors.length) return toast.error("Choose a subject and fix parsing errors first.");
    setImporting(true);
    try {
      const result = await appendBankQuestions(subjectId, legacyTopicId === "none" ? null : legacyTopicId, legacyResult.questions);
      if (!result.success) return toast.error(result.error || "Import failed.");
      toast.success(`Imported ${legacyResult.questions.length} MCQs.`); window.location.reload();
    } finally { setImporting(false); }
  };
  const importCsv = async () => {
    if (!csvResult?.canImport) return toast.error("Parse the CSV and fix every error first.");
    setImporting(true);
    try {
      const result = await importAdminBankQuestionCsv(subjectId, csvText);
      if (!result.success) return toast.error(result.error);
      toast.success(`Imported ${result.count ?? 0} questions atomically.`); window.location.reload();
    } finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader><DialogTitle>Import Question Bank</DialogTitle><DialogDescription>Legacy pasted MCQs remain supported. Mixed question types use the validated CSV workflow.</DialogDescription></DialogHeader>
        <Field label="Subject"><Filter value={subjectId} label="Subject" options={subjects.map((subject) => ({ value: subject.id, label: subject.label }))} onChange={(value) => { setSubjectId(value); setLegacyTopicId("none"); setCsvResult(null); }} /></Field>
        <Tabs defaultValue="csv">
          <TabsList className="grid h-auto grid-cols-2"><TabsTrigger value="csv"><FileSpreadsheet className="size-4" /> Mixed CSV import</TabsTrigger><TabsTrigger value="legacy"><Upload className="size-4" /> Legacy MCQ import</TabsTrigger></TabsList>
          <TabsContent value="csv" className="space-y-4 pt-4">
            <div className="rounded-xl border bg-muted/30 p-4 text-sm"><p className="font-medium">Canonical header</p><code className="mt-2 block overflow-x-auto text-xs">TopicID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source</code><p className="mt-2 text-xs text-muted-foreground">ChapterID is accepted as a TopicID alias. An Importance column is allowed only with an explicit unsupported/deferred warning.</p></div>
            <Field label="Choose CSV file (optional)"><Input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setCsvText(await file.text()); setCsvResult(null); }} /></Field>
            <Textarea className="min-h-64 font-mono text-xs" value={csvText} onChange={(event) => { setCsvText(event.target.value); setCsvResult(null); }} placeholder={'TopicID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source\nclxyz,MCQ,"What is SQL?",A,B,C,D,A,,,easy,1,Textbook'} />
            <Button variant="outline" onClick={parseCsv} disabled={!subjectId || !csvText.trim()}>Parse and preview CSV</Button>
            {csvResult && <CsvPreview result={csvResult} />}
            <Button className="w-full" onClick={importCsv} disabled={importing || !csvResult?.canImport}>{importing ? "Importing…" : `Import ${csvResult?.rows.length ?? 0} validated questions`}</Button>
          </TabsContent>
          <TabsContent value="legacy" className="space-y-4 pt-4">
            <Field label="Topic (optional for legacy imports)"><Filter value={legacyTopicId} label="Topic" disabled={!subjectId} options={[{ value: "none", label: "No topic" }, ...availableTopics.map((topic) => ({ value: topic.id, label: topic.label }))]} onChange={setLegacyTopicId} /></Field>
            <Textarea className="min-h-64 font-mono text-xs" value={legacyText} onChange={(event) => { setLegacyText(event.target.value); setLegacyResult(null); }} placeholder={'QUESTION: What is a primary key?\nA) Calculation field\nB) Unique identifier\nC) Validation rule\nD) Data type\nANSWER: B\nDIFFICULTY: Easy\nMARKS: 1\n---'} />
            <Button variant="outline" onClick={() => setLegacyResult(parseQuestions(legacyText))}>Parse legacy MCQs</Button>
            {legacyResult && <div className={cn("rounded-xl border p-4 text-sm", legacyResult.errors.length ? "border-destructive/30 bg-destructive/10" : "border-emerald-500/30 bg-emerald-500/10")}><p className="font-semibold">{legacyResult.questions.length} ready · {legacyResult.errors.length} errors</p>{legacyResult.errors.map((error, index) => <p key={index} className="mt-1 text-destructive">Line {error.line}: {error.message}</p>)}</div>}
            <Button className="w-full" onClick={importLegacy} disabled={importing || !legacyResult || legacyResult.errors.length > 0}>{importing ? "Importing…" : `Import ${legacyResult?.questions.length ?? 0} MCQs`}</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CsvPreview({ result }: { result: BankQuestionCsvResult }) {
  return <div className="space-y-3"><div className={cn("rounded-xl border p-3 text-sm", result.canImport ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10")}><p className="font-semibold">{result.rows.length} rows · {result.rows.filter((row) => row.errors.length).length} invalid</p>{result.fileErrors.map((error) => <p key={error} className="text-destructive">{error}</p>)}</div><div className="max-h-80 overflow-auto rounded-xl border"><Table><TableHeader><TableRow><TableHead>Row</TableHead><TableHead>Type / question</TableHead><TableHead>Topic</TableHead><TableHead>Difficulty</TableHead><TableHead>Marks</TableHead><TableHead>Validation</TableHead></TableRow></TableHeader><TableBody>{result.rows.map((row) => <TableRow key={row.rowNumber}><TableCell>{row.rowNumber}</TableCell><TableCell><Badge variant="outline">{row.questionType ? BANK_QUESTION_TYPE_LABELS[row.questionType] : "Unsupported"}</Badge><p className="mt-1 max-w-72 line-clamp-2 text-xs">{row.questionText}</p></TableCell><TableCell className="text-xs">{row.topicName}</TableCell><TableCell className="capitalize">{row.difficulty}</TableCell><TableCell>{row.marks ?? "—"}</TableCell><TableCell className="min-w-64">{row.errors.map((error) => <p key={error} className="flex gap-1 text-xs text-destructive"><AlertCircle className="mt-0.5 size-3 shrink-0" />{error}</p>)}{row.warnings.map((warning) => <p key={warning} className="text-xs text-amber-700 dark:text-amber-300">Warning: {warning}</p>)}{row.errors.length === 0 && row.warnings.length === 0 && <span className="text-xs text-emerald-700 dark:text-emerald-300">Ready</span>}</TableCell></TableRow>)}</TableBody></Table></div></div>;
}

function Filter({ value, label, options, onChange, disabled }: { value: string; label: string; options: { value: string; label: string }[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <Select value={value} onValueChange={(next) => onChange(next || "")} disabled={disabled}><SelectTrigger className="w-full" aria-label={label}><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-2", className)}><Label>{label}</Label>{children}</div>;
}
