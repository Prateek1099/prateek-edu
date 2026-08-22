import { BookOpen, GraduationCap, Target, Users } from "lucide-react";
import { FeatureGrid, MarketingCta, MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "About Vexa",
  description: "Learn how Vexa supports teachers and students with structured assessment preparation, question banks, paper generation, and focused learning resources.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div>
      <MarketingHero
        eyebrow="Vision · Excellence · Achievement"
        title="Assessment preparation made structured and usable"
        description="Vexa is built to help teachers prepare classroom assessments and help students find clear, focused learning material without unnecessary complexity."
        secondary={{ href: "/resources", label: "Explore Resources" }}
      />
      <FeatureGrid
        eyebrow="Our focus"
        title="Purposeful tools for teaching and learning"
        features={[
          { icon: Target, title: "Vision", description: "Make high-quality academic preparation easier to organize, reuse, and improve." },
          { icon: GraduationCap, title: "Excellence", description: "Support consistent question selection, paper patterns, answer keys, and student materials." },
          { icon: BookOpen, title: "Achievement", description: "Help teachers save preparation time and help students revise with clearer resources." },
          { icon: Users, title: "Built for schools", description: "Begin with managed pilots and practical onboarding instead of promising an oversized all-in-one system." },
        ]}
      />
      <section className="border-y border-border/60 bg-muted/25 py-16">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Where Vexa is starting</h2>
          <p className="mt-5 leading-7 text-muted-foreground">Vexa is initially focused on Computer Science, Information and Communication Technology, Informatics Practices, Information Technology, and related school subjects. Coverage grows deliberately as structured, usable material becomes available.</p>
          <p className="mt-4 leading-7 text-muted-foreground">Vexa is an independent educational support platform. It is not officially affiliated with, endorsed by, or operated by CBSE, Cambridge International, or any examination board.</p>
        </div>
      </section>
      <MarketingCta title="Interested in a Vexa school pilot?" description="Share your current assessment workflow and the subjects you want to support." />
    </div>
  );
}
