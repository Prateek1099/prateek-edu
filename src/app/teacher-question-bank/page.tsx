import { Filter, FileInput, Image as ImageIcon, Layers3, Search, ShieldCheck } from "lucide-react";
import { ChecklistSection, FeatureGrid, MarketingCta, MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Teacher Question Bank Platform",
  description: "Organize mixed question types by board, class, subject, chapter, difficulty, and marks, then use validated questions in Vexa's managed paper generation workflow.",
  path: "/teacher-question-bank",
});

export default function TeacherQuestionBankPage() {
  return (
    <div>
      <MarketingHero
        eyebrow="Teacher question bank platform"
        title="Organize reusable questions for reliable paper generation"
        description="Vexa keeps questions structured by academic scope, type, difficulty, marks, source, and chapter so teachers can build papers from a clear, validated collection."
        secondary={{ href: "/question-paper-generator", label: "See Paper Generation" }}
      />
      <FeatureGrid
        eyebrow="Question organization"
        title="More than a folder of copied questions"
        features={[
          { icon: Layers3, title: "Academic structure", description: "Organize questions under a defined board, qualification or class, subject, and exact topic." },
          { icon: Filter, title: "Useful filters", description: "Narrow the bank by question type, difficulty, marks, source, and chapter." },
          { icon: Search, title: "Readable review", description: "Search and preview question text, answer fields, options, explanations, and images before use." },
          { icon: FileInput, title: "Controlled imports", description: "Use legacy MCQ paste import or preview mixed CSV rows before an atomic import." },
          { icon: ImageIcon, title: "Visual support", description: "Attach supported PNG, JPEG, or WebP visuals for diagram and identification-style prompts." },
          { icon: ShieldCheck, title: "Compatibility protection", description: "MCQ-only systems explicitly filter complete MCQs so written types do not leak into incompatible flows." },
        ]}
      />
      <ChecklistSection
        eyebrow="Supported question types"
        title="A mixed bank prepared for school papers"
        items={["Multiple-choice questions", "True or false", "Fill in the blank", "Assertion and reason", "Very short answer", "Short answer", "Long answer", "Teacher model answers and explanations"]}
      />
      <MarketingCta title="Evaluate Vexa with your subject content" description="We can demonstrate how a structured Question Bank connects to a blueprint-based paper workflow during a managed pilot." />
    </div>
  );
}
