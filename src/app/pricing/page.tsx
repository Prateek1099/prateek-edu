import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingHero } from "@/components/marketing/MarketingPage";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Early Access and School Pilot Pricing",
  description: "Explore managed early access, school pilot, and custom setup options for Vexa's question bank and blueprint paper generation workflow.",
  path: "/pricing",
});

const tiers = [
  {
    name: "Individual Teacher",
    label: "Early access",
    description: "For an educator who wants to evaluate the question bank and paper-generation workflow.",
    features: ["Managed account setup", "Question Bank access", "Paper generation workflow", "Editable DOCX exports"],
  },
  {
    name: "School Pilot",
    label: "Pilot pricing",
    description: "For a school team testing Vexa with selected teachers, subjects, and assessment patterns.",
    features: ["School setup", "Teacher onboarding", "Subject and content setup", "Blueprint templates and paper workflow"],
    featured: true,
  },
  {
    name: "Custom Setup",
    label: "Managed rollout",
    description: "For schools that need tailored content organization, templates, or onboarding support.",
    features: ["Requirements review", "Custom content preparation", "Header and blueprint setup", "Guided implementation"],
  },
];

export default function PricingPage() {
  return (
    <div>
      <MarketingHero
        eyebrow="Early access"
        title="Practical pilot options for teachers and schools"
        description="Vexa is currently offered through demos, pilots, and managed rollouts. We will recommend a setup based on your subjects, teacher team, and paper workflow."
      />
      <section className="py-16 sm:py-20">
        <div className="container mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {tiers.map((tier) => (
            <article key={tier.name} className={`flex flex-col rounded-3xl border p-6 sm:p-8 ${tier.featured ? "border-primary/50 bg-primary/5 shadow-lg" : "border-border/80 bg-card"}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{tier.label}</p>
              <h2 className="mt-3 text-2xl font-bold">{tier.name}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-muted-foreground">{tier.description}</p>
              <p className="mt-5 text-lg font-bold">Contact for setup</p>
              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}
              </ul>
              <Button nativeButton={false} render={<Link href="/request-demo" />} variant={tier.featured ? "default" : "outline"} className="mt-8 min-h-11 rounded-xl">Discuss this option</Button>
            </article>
          ))}
        </div>
        <div className="container mx-auto mt-10 max-w-3xl px-4 text-center text-sm leading-6 text-muted-foreground sm:px-6">
          Pricing and access are agreed before setup. The teacher product is not currently an instant, unrestricted self-service subscription.
        </div>
      </section>
    </div>
  );
}
