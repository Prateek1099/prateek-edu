import Link from "next/link";
import { ArrowRight, BookOpen, FileDown, FileQuestion, FolderTree, GraduationCap, LayoutTemplate, ShieldCheck } from "lucide-react";
import { getEcosystemPreference } from "@/app/actions/resources-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { publicMetadata } from "@/lib/seo";

export const metadata = {
  ...publicMetadata({
  title: "Question Paper Builder and Learning Resources",
  description: "Vexa helps schools prepare blueprint-based test papers, structured question banks, answer keys, and editable DOCX exports, alongside focused student resources.",
  path: "/",
  }),
  title: { absolute: "Vexa | Question Paper Builder and Learning Resources" },
};

export default async function Home() {
  const prefRaw = await getEcosystemPreference();
  const ecosystemPref = prefRaw ? {
    ...prefRaw,
    boardTitle: prefRaw.board === "cambridge" ? "Cambridge International" : prefRaw.board === "cbse" ? "CBSE" : prefRaw.board,
    qualTitle: prefRaw.qualification === "igcse" ? "IGCSE" : prefRaw.qualification === "as-a-level" ? "AS & A Level" : prefRaw.qualification === "o-level" ? "O Level" : prefRaw.qualification?.toUpperCase() || "",
  } : null;

  return (
    <div className="w-full overflow-hidden bg-background">
      <section className="relative border-b border-border/60">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-28 -z-10 mx-auto h-[36rem] max-w-7xl bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
        <div className="container mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">For teachers, schools, and focused learners</p>
            <h1 className="mt-6 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">Create classroom-ready test papers from a structured question bank</h1>
            <p className="mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">Vexa helps schools prepare chapter-wise, mixed-question papers with blueprint controls, answer keys, and editable Word exports—alongside focused learning resources for students.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button nativeButton={false} render={<Link href="/request-demo" />} size="lg" className="min-h-12 rounded-xl px-6 font-semibold shadow-md">Request a School Demo<ArrowRight className="size-4" /></Button>
              <Button nativeButton={false} render={<Link href="/resources" />} size="lg" variant="outline" className="min-h-12 rounded-xl px-6 font-semibold">Explore Student Resources</Button>
            </div>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">Teacher and school access is currently available through managed demos and pilots.</p>
          </div>
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-5">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Blueprint paper workflow</p><h2 className="mt-1 text-xl font-bold">From pattern to printable paper</h2></div>
              <FileQuestion className="size-9 text-primary" aria-hidden="true" />
            </div>
            <ol className="mt-6 space-y-5">
              {[
                [LayoutTemplate, "Set the blueprint", "Choose chapters, question types, marks, and difficulty."],
                [ShieldCheck, "Validate availability", "Generate only when the complete pattern can be fulfilled."],
                [FileDown, "Review and export", "Prepare a student paper and teacher answer key as editable DOCX files."],
              ].map(([Icon, title, description], index) => {
                const StepIcon = Icon as typeof LayoutTemplate;
                return <li key={String(title)} className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><StepIcon className="size-5" /></div><div><p className="text-xs font-bold text-primary">Step {index + 1}</p><h3 className="font-bold">{String(title)}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{String(description)}</p></div></li>;
              })}
            </ol>
            <Link href="/question-paper-generator" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">See how Paper Builder works<ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Assessment preparation</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">A more controlled way to prepare school papers</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-muted-foreground">Structure questions once, reuse paper patterns, and keep the final teacher document editable.</p></div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              [FolderTree, "Structured Question Bank", "Keep questions organized by board, class, subject, chapter, type, marks, difficulty, and source."],
              [LayoutTemplate, "Blueprint Controls", "Plan chapter-wise distribution before generation and block incomplete paper patterns."],
              [FileDown, "Editable Output", "Download question papers and matching answer keys as editable Word-compatible documents."],
            ].map(([Icon, title, description]) => {
              const FeatureIcon = Icon as typeof FolderTree;
              return <article key={String(title)} className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FeatureIcon className="size-5" /></div><div><h3 className="font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{String(description)}</p></div></article>;
            })}
          </div>
          <div className="mt-9 text-center"><Button nativeButton={false} render={<Link href="/features" />} variant="outline" className="rounded-xl">Explore all Vexa features</Button></div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/25 py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">For students</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Focused resources still remain central to Vexa</h2><p className="mt-4 leading-7 text-muted-foreground">Students can explore published notes, topical questions, worksheets, syllabus documents, practice challenges, and courses organized by academic board and subject.</p></div>
            {ecosystemPref ? (
              <Card className="rounded-2xl border-border/80"><CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="size-6" /></div><div><h3 className="font-bold">Continue with {ecosystemPref.boardTitle}</h3><p className="text-sm text-muted-foreground">{ecosystemPref.qualTitle || "Choose a qualification to continue"}</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Button nativeButton={false} render={<Link href={ecosystemPref.qualification ? `/resources/${ecosystemPref.board}/${ecosystemPref.qualification}` : `/resources/${ecosystemPref.board}`} />}>Continue learning</Button><Button nativeButton={false} render={<Link href="/resources" />} variant="outline">Change selection</Button></div></CardContent></Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <BoardChoice board="cambridge" title="Cambridge-focused" description="IGCSE, O Level, AS & A Level resources for supported subjects." />
                <BoardChoice board="cbse" title="CBSE-focused" description="Class 9–12 resources for supported subjects and courses." />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"><div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl sm:px-12"><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore Vexa for your school</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80 sm:text-base">Share your subjects and assessment workflow. We will show you the capabilities that are ready today and discuss a practical pilot.</p><Button nativeButton={false} render={<Link href="/request-demo" />} size="lg" variant="secondary" className="mt-7 min-h-12 rounded-xl px-6 font-semibold">Request a School Demo<ArrowRight className="size-4" /></Button></div></div>
      </section>
    </div>
  );
}

function BoardChoice({ board, title, description }: { board: "cambridge" | "cbse"; title: string; description: string }) {
  return (
    <form action={async () => {
      "use server";
      const { setEcosystemPreference } = await import("@/app/actions/resources-actions");
      const { redirect } = await import("next/navigation");
      await setEcosystemPreference(board, "");
      redirect("/resources");
    }}>
      <button type="submit" className="h-full w-full rounded-2xl border border-border/80 bg-card p-6 text-left shadow-sm transition-colors hover:border-primary/50" aria-label={`Explore ${title} resources`}>
        <BookOpen className="size-7 text-primary" /><h3 className="mt-5 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">Choose resources<ArrowRight className="size-4" /></span>
      </button>
    </form>
  );
}
