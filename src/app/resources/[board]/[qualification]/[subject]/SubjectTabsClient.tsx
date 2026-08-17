"use client";

import { useMemo, useState } from "react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, BookMarked, BookOpen, BookOpenCheck, ClipboardCheck, Clock, Download, FileQuestion, FileText, ListChecks, NotebookPen, ScrollText, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  mixed: "border-primary/50 text-primary bg-primary/10",
};

type Note = {
  id: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  noteType: "NOTEBOOK_WORK" | "STUDY_NOTES";
  topic: Topic | null;
};
type Topic = { id: string; topicName: string };
type Subject = { slug: string; name: string; syllabusPdfUrl: string | null };
type TopicalQuestion = {
  id: string;
  title: string;
  description: string | null;
  hasSolutions: boolean;
  topic: Topic | null;
};
type Challenge = {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  estimatedTime: number;
  pdfUrl: string | null;
  pdfAnswerUrl: string | null;
  topic: Topic | null;
  _count: { questions: number };
};

function noteExcerpt(note: Note) {
  const content = note.content?.replace(/\s+/g, " ").trim();
  if (content) {
    return content.length > 170 ? `${content.slice(0, 167)}…` : content;
  }

  return note.noteType === "NOTEBOOK_WORK"
    ? "Concise classroom-ready points to copy into your notebook."
    : "Detailed explanations and revision support for this topic.";
}

function chapterOrderFromTitle(title: string) {
  const match = title.match(/\b(?:chapter|ch)\s*[-.:]?\s*(\d+)/i);
  return match ? Number.parseInt(match[1], 10) - 1 : Number.MAX_SAFE_INTEGER;
}

export default function SubjectTabsClient({
  topics,
  notes,
  topicals,
  subject,
  challenges = [],
  board = "",
  qualification = "",
}: {
  topics: Topic[];
  notes: Note[];
  topicals: TopicalQuestion[];
  subject: Subject;
  challenges?: Challenge[];
  board?: string;
  qualification?: string;
}) {
  const [practiceTopic, setPracticeTopic] = useState("all");
  const [practiceDifficulty, setPracticeDifficulty] = useState("all");
  const quickPractices = challenges.filter((challenge) => challenge.type === "QUICK_PRACTICE");
  const standardChallenges = challenges.filter((challenge) => challenge.type === "CHALLENGE" || !challenge.type);
  const worksheets = challenges.filter((challenge) => challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET");
  const quickPracticeTopicIds = new Set(quickPractices.map((practice) => practice.topic?.id).filter(Boolean));
  const availablePracticeTopics = topics.filter((topic) => quickPracticeTopicIds.has(topic.id));
  const availableDifficulties = Array.from(new Set(quickPractices.map((practice) => practice.difficulty)));
  const filteredQuickPractices = quickPractices.filter((practice) => {
    const matchesTopic = practiceTopic === "all" || practice.topic?.id === practiceTopic;
    const matchesDifficulty = practiceDifficulty === "all" || practice.difficulty === practiceDifficulty;
    return matchesTopic && matchesDifficulty;
  });
  const notebookNotes = notes.filter((note) => note.noteType === "NOTEBOOK_WORK");
  const studyNotes = notes.filter((note) => note.noteType === "STUDY_NOTES");
  const orderedTopicals = useMemo(() => {
    const topicOrder = new Map(topics.map((topic, index) => [topic.id, index]));

    return [...topicals].sort((left, right) => {
      const leftOrder = left.topic
        ? (topicOrder.get(left.topic.id) ?? chapterOrderFromTitle(left.title))
        : chapterOrderFromTitle(left.title);
      const rightOrder = right.topic
        ? (topicOrder.get(right.topic.id) ?? chapterOrderFromTitle(right.title))
        : chapterOrderFromTitle(right.title);

      return leftOrder - rightOrder || left.title.localeCompare(right.title, undefined, { numeric: true });
    });
  }, [topicals, topics]);

  const renderNoteSection = (
    sectionNotes: Note[],
    type: "NOTEBOOK_WORK" | "STUDY_NOTES",
  ) => {
    if (sectionNotes.length === 0) return null;

    const isNotebookWork = type === "NOTEBOOK_WORK";
    const SectionIcon = isNotebookWork ? NotebookPen : BookOpenCheck;

    return (
      <section>
        <div className="mb-5 flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 rounded-xl p-2.5",
              isNotebookWork
                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                : "bg-primary/10 text-primary",
            )}
          >
            <SectionIcon className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {isNotebookWork ? "Notebook Work" : "Study Notes"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              {isNotebookWork
                ? "Short definitions, key points, and examples you can copy into your school notebook."
                : "Detailed explanations and revision material for understanding topics and preparing for exams."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sectionNotes.map((note) => {
            const isPdf = Boolean(note.pdfUrl);
            const href =
              isPdf && note.pdfUrl
                ? `/notes/viewer?pdf=${encodeURIComponent(note.pdfUrl)}&title=${encodeURIComponent(note.title)}`
                : `/resources/${board}/${qualification}/${subject.slug}/notes/${note.id}`;

            return (
              <article
                key={note.id}
                className="flex min-h-64 flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:ring-primary/35 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {isPdf ? "PDF note" : "Text note"}
                  </Badge>
                  {note.topic && (
                    <Badge variant="outline">{note.topic.topicName}</Badge>
                  )}
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">
                  {note.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {noteExcerpt(note)}
                </p>
                <Link
                  href={href}
                  className={cn(
                    buttonVariants({
                      size: "lg",
                      variant: isNotebookWork ? "outline" : "default",
                    }),
                    "mt-auto h-11 w-full gap-2 pt-0 sm:w-fit",
                  )}
                >
                  {isPdf ? (
                    <FileText className="size-4" />
                  ) : (
                    <ScrollText className="size-4" />
                  )}
                  {isNotebookWork
                    ? "Open Notebook Work"
                    : "Open Study Notes"}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <TabsPrimitive.Root defaultValue="practice" className="w-full">
      <TabsPrimitive.List className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-1.5 rounded-2xl sm:rounded-full border border-zinc-200/80 bg-white/80 p-1.5 backdrop-blur-md max-w-3xl shadow-sm ring-1 ring-zinc-200/60 dark:border-white/10 dark:bg-[#11111a]/80 dark:ring-white/5">
        <TabsPrimitive.Tab
          value="practice"
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-3 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/25 data-[active]:border-indigo-400/30 border border-transparent"
        >
          <Zap className="size-4 shrink-0 transition-transform group-hover:scale-105 text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white group-data-[active]:text-white dark:group-data-[active]:text-white" />
          <span>Practice</span>
        </TabsPrimitive.Tab>
        <TabsPrimitive.Tab
          value="notes"
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-3 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/25 data-[active]:border-indigo-400/30 border border-transparent"
        >
          <ScrollText className="size-4 shrink-0 transition-transform group-hover:scale-105 text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white group-data-[active]:text-white dark:group-data-[active]:text-white" />
          <span>Notes</span>
        </TabsPrimitive.Tab>
        <TabsPrimitive.Tab
          value="topicals"
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-3 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/25 data-[active]:border-indigo-400/30 border border-transparent"
        >
          <FileQuestion className="size-4 shrink-0 transition-transform group-hover:scale-105 text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white group-data-[active]:text-white dark:group-data-[active]:text-white" />
          <span>Topical Questions</span>
        </TabsPrimitive.Tab>
        <TabsPrimitive.Tab
          value="syllabus"
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-full px-3 py-2.5 sm:py-2.5 text-xs sm:text-sm font-medium text-zinc-600 transition-all duration-200 cursor-pointer select-none outline-none hover:text-zinc-950 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10 data-[active]:bg-gradient-to-r data-[active]:from-indigo-600 data-[active]:to-indigo-500 data-[active]:text-white data-[active]:font-semibold data-[active]:shadow-md data-[active]:shadow-indigo-500/25 data-[active]:border-indigo-400/30 border border-transparent"
        >
          <ListChecks className="size-4 shrink-0 transition-transform group-hover:scale-105 text-zinc-500 group-hover:text-zinc-950 dark:text-zinc-300 dark:group-hover:text-white group-data-[active]:text-white dark:group-data-[active]:text-white" />
          <span>Syllabus</span>
        </TabsPrimitive.Tab>
      </TabsPrimitive.List>
      
      {/* Practice hub */}

      <TabsPrimitive.Panel value="notes" className="mt-0 outline-none">
        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-14 text-center">
            <BookOpen className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold">No notes available</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Notebook Work and Study Notes for this subject will appear here when they are published.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <header className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">Notes</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Write the essentials. Study the details.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                Use Notebook Work for concise classroom material and Study Notes for deeper understanding and exam preparation.
              </p>
            </header>
            {renderNoteSection(notebookNotes, "NOTEBOOK_WORK")}
            {renderNoteSection(studyNotes, "STUDY_NOTES")}
          </div>
        )}
      </TabsPrimitive.Panel>

      <TabsPrimitive.Panel value="topicals" className="mt-0 outline-none">
        <div className="space-y-8">
          <header className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Topical Questions</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Practise one chapter at a time.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Open focused question packs by topic, then use the separate solutions document when you are ready to check your work.
            </p>
          </header>

          {topicals.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-14 text-center">
              <FileQuestion className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No topical questions available</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Published chapter-wise question packs for this subject will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {orderedTopicals.map((resource) => (
                <article key={resource.id} className="flex min-h-64 flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:ring-primary/35 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">Questions PDF</Badge>
                    {resource.hasSolutions && <Badge variant="outline">Solutions included</Badge>}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{resource.title}</h3>
                  <p className="mt-1 text-sm font-medium text-primary/80">{resource.topic?.topicName || "Whole subject"}</p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                    {resource.description || "A focused set of questions for practising this topic."}
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-6 sm:flex-row">
                    <Link href={`/resources/${board}/${qualification}/${subject.slug}/topical/${resource.id}`} className={cn(buttonVariants({ size: "lg" }), "h-11 flex-1 gap-2")}>
                      <FileQuestion className="size-4" /> Open Questions
                    </Link>
                    {resource.hasSolutions && (
                      <Link href={`/resources/${board}/${qualification}/${subject.slug}/topical/${resource.id}?document=solutions`} className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 flex-1 gap-2")}>
                        <BookOpenCheck className="size-4" /> View Solutions
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </TabsPrimitive.Panel>

      <TabsPrimitive.Panel value="practice" className="mt-0 outline-none">
        <div className="space-y-12">
          <header className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">Practice</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Choose how you want to revise today.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              Build quick recall with MCQs, work through longer worksheets, or revisit questions you found difficult.
            </p>
          </header>

          {standardChallenges.length === 0 && worksheets.length === 0 && quickPractices.length === 0 && (
            <section className="rounded-2xl border border-dashed bg-muted/25 px-5 py-12 text-center">
              <ClipboardCheck className="mx-auto size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No practice activities available</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Practice challenges and worksheets for this subject will appear here when they are published.
              </p>
            </section>
          )}

          {standardChallenges.length > 0 && (
            <section>
              <div className="mb-5 flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Practice Challenges</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Fast MCQ-based revision for recall, topic mastery, and instant scoring.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {standardChallenges.map((challenge) => (
                  <article key={challenge.id} className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Badge variant="secondary" className="font-medium">
                        {challenge.topic?.topicName || "Mixed topics"}
                      </Badge>
                      <Badge variant="outline" className={cn("capitalize", difficultyColor[challenge.difficulty] || difficultyColor.medium)}>
                        {challenge.difficulty}
                      </Badge>
                    </div>
                    <h4 className="mt-5 text-lg font-semibold tracking-tight">{challenge.title}</h4>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck className="size-4" />
                        {challenge._count.questions} question{challenge._count.questions === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4" />
                        About {challenge.estimatedTime} min
                      </span>
                    </div>
                    <Link href={`/resources/${board}/${qualification}/${subject.slug}/challenge/${challenge.id}`} className="mt-6">
                      <Button size="lg" className="h-11 w-full gap-2">
                        Start challenge
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          {quickPractices.length > 0 && (
            <section>
              <div className="mb-5 flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Target className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Topic Practice</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Focused mixed practice built around a specific topic.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-muted/40 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(10rem,auto)] sm:items-end">
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</span>
                    <div className="flex h-11 items-center gap-2 rounded-xl bg-background px-3 text-sm font-medium ring-1 ring-foreground/10">
                      <BookOpen className="size-4 text-primary" />
                      <span className="truncate">{subject.name}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="practice-topic">
                      Topic
                    </label>
                    <Select value={practiceTopic} onValueChange={(value) => value && setPracticeTopic(value)}>
                      <SelectTrigger id="practice-topic" className="h-11 w-full rounded-xl bg-background">
                        <SelectValue placeholder="All topics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All topics</SelectItem>
                        {availablePracticeTopics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>{topic.topicName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="practice-difficulty">
                      Difficulty
                    </label>
                    <Select value={practiceDifficulty} onValueChange={(value) => value && setPracticeDifficulty(value)}>
                      <SelectTrigger id="practice-difficulty" className="h-11 w-full rounded-xl bg-background">
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All levels</SelectItem>
                        {availableDifficulties.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty}>
                            <span className="capitalize">{difficulty}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {filteredQuickPractices.length === 0 ? (
                <div className="mt-4 rounded-2xl bg-muted/25 px-5 py-9 text-center">
                  <Target className="mx-auto size-8 text-muted-foreground" />
                  <h4 className="mt-3 font-semibold">No matching topic practice</h4>
                  <p className="mt-1 text-sm text-muted-foreground">Try a different topic or difficulty.</p>
                  <Button
                    variant="ghost"
                    className="mt-3"
                    onClick={() => {
                      setPracticeTopic("all");
                      setPracticeDifficulty("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
                  {filteredQuickPractices.map((practice, index) => (
                    <article
                      key={practice.id}
                      className={cn(
                        "flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6",
                        index > 0 && "border-t"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">{practice.topic?.topicName || "Mixed topics"}</Badge>
                          <Badge variant="outline" className={cn("capitalize", difficultyColor[practice.difficulty] || difficultyColor.medium)}>
                            {practice.difficulty}
                          </Badge>
                        </div>
                        <h4 className="mt-3 text-lg font-semibold tracking-tight">{practice.title}</h4>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <ClipboardCheck className="size-4" />
                            {practice._count.questions} question{practice._count.questions === 1 ? "" : "s"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-4" />
                            About {practice.estimatedTime} min
                          </span>
                        </div>
                      </div>
                      <Link href={`/resources/${board}/${qualification}/${subject.slug}/challenge/${practice.id}`} className="shrink-0">
                        <Button size="lg" variant="outline" className="h-11 w-full gap-2 px-5 sm:w-auto">
                          Start topic practice
                          <ArrowRight className="size-4" />
                        </Button>
                      </Link>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {worksheets.length > 0 && (
            <section>
              <div className="mb-5 flex items-start gap-3">
                <div className="mt-0.5 rounded-xl bg-blue-500/10 p-2.5 text-blue-600 dark:text-blue-400">
                  <FileText className="size-5" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">Worksheets</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Longer teacher-created activities, assignments, and printable revision.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {worksheets.map((worksheet) => (
                  <article key={worksheet.id} className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Badge variant="secondary">
                        {worksheet.type === "PDF_WORKSHEET" ? "PDF worksheet" : "Printable worksheet"}
                      </Badge>
                      {worksheet.pdfAnswerUrl && <Badge variant="outline">Answer key included</Badge>}
                    </div>
                    <h4 className="mt-5 text-lg font-semibold tracking-tight">{worksheet.title}</h4>
                    {worksheet.topic && <p className="mt-1 text-sm text-muted-foreground">{worksheet.topic.topicName}</p>}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <ClipboardCheck className="size-4" />
                        {worksheet.type === "PDF_WORKSHEET"
                          ? "PDF format"
                          : `${worksheet._count.questions} question${worksheet._count.questions === 1 ? "" : "s"}`}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-4" />
                        About {worksheet.estimatedTime} min
                      </span>
                    </div>

                    <Link
                      href={`/resources/${board}/${qualification}/${subject.slug}/worksheet/${worksheet.id}`}
                      className="mt-6"
                    >
                      <Button size="lg" variant="outline" className="h-11 w-full gap-2">
                        Open worksheet
                        <ArrowRight className="size-4" />
                      </Button>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-5 rounded-2xl bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <BookMarked className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Mistake Book</h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Review questions you answered incorrectly and focus revision on your weaker areas.
                </p>
              </div>
            </div>
            <Link href="/dashboard/mistakes" className="shrink-0">
              <Button size="lg" variant="outline" className="h-11 w-full gap-2 bg-background sm:w-auto">
                Review mistakes
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </section>
        </div>
      </TabsPrimitive.Panel>

      <TabsPrimitive.Panel value="syllabus" className="mt-0 outline-none">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle>Syllabus Outline</CardTitle>
            <CardDescription>Overview of the {subject.name} curriculum.</CardDescription>
          </CardHeader>
          <CardContent>
             {subject.syllabusPdfUrl ? (
               <div className="flex flex-col gap-4">
                 <p className="text-muted-foreground">The official syllabus document is available for viewing or downloading below.</p>
                 <div className="flex gap-4">
                   <Link
                     href={subject.syllabusPdfUrl}
                     target="_blank"
                     rel="noopener noreferrer"
                     className={cn(buttonVariants({ variant: "default" }), "gap-2")}
                   >
                     <FileText className="h-4 w-4" /> View PDF
                   </Link>
                   <a
                     href={subject.syllabusPdfUrl}
                     download
                     target="_blank"
                     rel="noopener noreferrer"
                     className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                   >
                     <Download className="h-4 w-4" /> Download
                   </a>
                 </div>
               </div>
             ) : (
               <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                 <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
                 <h3 className="text-lg font-semibold text-foreground">Syllabus unavailable</h3>
                 <p className="text-muted-foreground mt-2">The syllabus for this subject has not been uploaded yet.</p>
               </div>
             )}
          </CardContent>
        </Card>
      </TabsPrimitive.Panel>
    </TabsPrimitive.Root>
  );
}
