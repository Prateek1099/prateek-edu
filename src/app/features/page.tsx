import {
  Archive,
  BarChart3,
  BookOpenCheck,
  Boxes,
  FileDown,
  FileQuestion,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutTemplate,
  ListChecks,
  NotebookPen,
} from "lucide-react";
import { FeatureGrid, MarketingCta, MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Features for Teachers and Schools",
  description: "Explore Vexa's question bank, blueprint paper builder, answer keys, editable DOCX exports, saved templates, worksheets, notes, and student practice resources.",
  path: "/features",
});

const features = [
  { icon: Boxes, title: "Structured Question Bank", description: "Organize global Vexa questions by board, class, subject, chapter, type, difficulty, marks, and source." },
  { icon: ListChecks, title: "Mixed Question Types", description: "Build with MCQs, true/false, fill-in-the-blank, assertion-reason, and written-answer questions." },
  { icon: FileQuestion, title: "Blueprint Paper Builder", description: "Define chapter-wise patterns and generate a complete paper only when every required row can be fulfilled." },
  { icon: BarChart3, title: "Chapter-wise Distribution", description: "Control question counts, marks, types, and difficulty across chapters before generating a paper." },
  { icon: LayoutTemplate, title: "Saved Blueprint Templates", description: "Reuse paper structures and optional header defaults without saving selected question IDs." },
  { icon: Archive, title: "Paper Archive", description: "Save the final ordered paper as a stable snapshot, reopen it, archive it, and export it later." },
  { icon: FileDown, title: "Editable DOCX Export", description: "Download question papers, teacher answer keys, or both as editable Word-compatible documents." },
  { icon: BookOpenCheck, title: "Teacher Answer Keys", description: "Keep question numbering aligned while showing correct or model answers and explanations for teachers." },
  { icon: NotebookPen, title: "Notes", description: "Separate concise Notebook Work from detailed Study Notes for clear student use." },
  { icon: FileText, title: "Worksheets", description: "Present generated and PDF worksheets as structured assignment material rather than quick quizzes." },
  { icon: FolderKanban, title: "Topical Questions", description: "Give students chapter-organized question PDFs with optional solution documents." },
  { icon: GraduationCap, title: "Practice Challenges", description: "Offer short MCQ revision sessions with feedback and results, separate from worksheet study." },
];

export default function FeaturesPage() {
  return (
    <div>
      <MarketingHero
        eyebrow="Vexa capabilities"
        title="One structured workflow for assessment preparation and student resources"
        description="Vexa brings question organization, blueprint-based paper generation, editable exports, and focused learning materials into one carefully managed school workflow."
        secondary={{ href: "/question-paper-generator", label: "Explore Paper Builder" }}
      />
      <FeatureGrid
        eyebrow="Released capabilities"
        title="Built around real classroom preparation"
        description="These capabilities are available within Vexa today. Teacher and school access is currently provided through managed demos and pilots."
        features={features}
      />
      <section className="border-y border-border/60 bg-muted/25 py-14">
        <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Teacher insights are evolving</h2>
          <p className="mt-3 leading-7 text-muted-foreground">Workspace and insight capabilities are limited and being developed carefully. Vexa does not currently present itself as a complete LMS, ERP, attendance, fee-management, or parent application.</p>
        </div>
      </section>
      <MarketingCta title="See how Vexa fits your assessment workflow" description="Tell us about your subjects, paper patterns, and resource needs. We will discuss a practical managed pilot." />
    </div>
  );
}
