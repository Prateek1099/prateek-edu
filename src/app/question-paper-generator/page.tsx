import {
  Archive,
  FileDown,
  FileQuestion,
  Image as ImageIcon,
  LayoutTemplate,
  ListChecks,
} from "lucide-react";
import { ChecklistSection, FeatureGrid, MarketingCta, MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata, SITE_URL } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Question Paper Generator for Teachers",
  description: "Build chapter-wise school test papers from a structured question bank with blueprint controls, mixed question types, answer keys, and editable DOCX exports.",
  path: "/question-paper-generator",
});

const faqs = [
  { question: "Can teachers sign up for unrestricted Paper Builder access?", answer: "Not yet. Teacher and school access is currently arranged through a managed demo or pilot." },
  { question: "Can Vexa generate mixed-question papers?", answer: "Yes. The current managed Paper Builder supports MCQ, true/false, fill-in-the-blank, assertion-reason, very short, short, and long answer questions where matching Question Bank content is available." },
  { question: "Can papers be edited after export?", answer: "Yes. Question papers and teacher answer keys can be downloaded as editable DOCX files for final changes in Microsoft Word or compatible editors." },
  { question: "Does Vexa save every generated paper automatically?", answer: "No. A generated paper stays in the browser session unless an authorized administrator explicitly saves its final snapshot to the Paper Archive." },
];

export default function QuestionPaperGeneratorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vexa Question Paper Builder",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/question-paper-generator`,
    description: "A managed blueprint-based question paper generator for teachers and schools with mixed question types, answer keys, and editable DOCX export.",
    provider: { "@type": "Organization", name: "Vexa", url: SITE_URL },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
      <MarketingHero
        eyebrow="Question paper generator for teachers"
        title="Build chapter-wise test papers from a structured question bank"
        description="Use blueprint controls to define chapters, question types, marks, and difficulty—then review, reorder, print, or download an editable DOCX paper with its teacher answer key."
        secondary={{ href: "/teacher-question-bank", label: "Explore the Question Bank" }}
      />
      <FeatureGrid
        eyebrow="Assessment workflow"
        title="From blueprint to editable paper"
        features={[
          { icon: LayoutTemplate, title: "Blueprint-based generation", description: "Set exact chapter-wise question counts, types, marks, and difficulty before generating." },
          { icon: ListChecks, title: "All-or-nothing validation", description: "Availability is checked first so an incomplete blueprint does not produce a misleading partial paper." },
          { icon: FileQuestion, title: "Review controls", description: "Replace, remove, refill, regenerate, reorder, and choose the final chapter-wise or shuffled output." },
          { icon: FileDown, title: "Editable DOCX", description: "Download the question paper, answer key, or a combined editable document." },
          { icon: ImageIcon, title: "Visual questions", description: "Include supported question images in preview, print, and question-paper DOCX output." },
          { icon: Archive, title: "Optional paper archive", description: "Authorized administrators can save the final paper snapshot and reopen or export it later." },
        ]}
      />
      <ChecklistSection
        eyebrow="Built for practical tests"
        title="Useful for everyday school assessment preparation"
        description="Vexa supports common classroom workflows without presenting itself as an automatic substitute for teacher review."
        items={["Tuesday, Friday, class, and revision tests", "Chapter-wise marks distribution", "Mixed objective and written questions", "Student paper and teacher answer key", "Reusable blueprint and header templates", "Browser print and editable Word export"]}
      />
      <section className="py-16 sm:py-20">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-center"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Questions</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Frequently asked questions</h2></div>
          <div className="mt-9 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card px-5 sm:px-8">
            {faqs.map((faq) => <section key={faq.question} className="py-6"><h3 className="font-bold">{faq.question}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p></section>)}
          </div>
        </div>
      </section>
      <MarketingCta title="Bring your school’s paper pattern into Vexa" description="Request a managed demonstration using the subjects and assessment structure relevant to your teachers." />
    </div>
  );
}
