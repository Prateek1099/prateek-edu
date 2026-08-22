import Link from "next/link";
import { BookOpen, Braces, Database, FileDown, TableProperties, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChecklistSection, FeatureGrid, MarketingCta, MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "CBSE Class 12 Informatics Practices Question Bank",
  description: "Explore a CBSE-focused Class 12 Informatics Practices question bank and paper-generation workflow for Python, Pandas, SQL, networks, and societal impacts topics.",
  path: "/cbse-informatics-practices-question-bank",
});

export default function CbseIpQuestionBankPage() {
  return (
    <div>
      <MarketingHero
        eyebrow="CBSE-focused Class 12 IP"
        title="Informatics Practices questions organized for chapter-wise assessment"
        description="Prepare classroom and revision papers using structured questions for Class 12 Informatics Practices topics, with mixed question types, answer keys, and editable DOCX output where content is available."
        secondary={{ href: "/resources/cbse", label: "Browse CBSE Resources" }}
      />
      <FeatureGrid
        eyebrow="Subject coverage"
        title="Built around practical Informatics Practices topics"
        description="Coverage depends on the published Vexa Question Bank and continues to grow. Typical areas include:"
        features={[
          { icon: TableProperties, title: "Pandas and data handling", description: "Series, DataFrames, indexing, importing, exporting, and data transformation concepts." },
          { icon: Database, title: "Database queries and SQL", description: "Querying tables, filtering, grouping, joins, aggregate functions, and SQL functions." },
          { icon: Workflow, title: "Computer networks", description: "Network concepts, devices, topologies, protocols, web services, and communication fundamentals." },
          { icon: Braces, title: "Python connections", description: "Questions that connect Python-based data handling with the broader Informatics Practices curriculum." },
          { icon: BookOpen, title: "Societal impacts", description: "Digital footprints, intellectual property, privacy, accessibility, cyber safety, and responsible technology use." },
          { icon: FileDown, title: "Paper-ready output", description: "Turn available question sets into reviewed question papers and editable teacher answer keys." },
        ]}
      />
      <ChecklistSection
        eyebrow="Teacher use cases"
        title="Use the bank for focused school assessments"
        items={["Chapter tests for SQL or Pandas", "Mixed one-, two-, three-, and longer-mark sections", "Revision papers across multiple chapters", "Question paper and teacher answer key", "Editable Word document for final formatting", "Reusable chapter-wise blueprint templates"]}
      />
      <section className="py-16">
        <div className="container mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">For teachers and students</h2>
          <p className="mt-4 leading-7 text-muted-foreground">Teachers can discuss managed access to the assessment workflow. Students can continue to use published notes, topical questions, worksheets, and practice resources from the public Resources section.</p>
          <Button nativeButton={false} render={<Link href="/resources" />} variant="outline" className="mt-6 min-h-11 rounded-xl">Explore Student Resources</Button>
          <p className="mt-8 text-xs leading-5 text-muted-foreground">Vexa is an independent educational support platform and is not officially affiliated with or endorsed by CBSE.</p>
        </div>
      </section>
      <MarketingCta title="Plan a Class 12 IP demonstration" description="Tell us which chapters and assessment patterns your school uses so we can discuss an appropriate pilot." />
    </div>
  );
}
