import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MarketingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function MarketingHero({
  eyebrow,
  title,
  description,
  primary = { href: "/request-demo", label: "Request a School Demo" },
  secondary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-32 -z-10 mx-auto h-[32rem] max-w-6xl bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl" />
      <div className="container mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <p className="mx-auto mb-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button nativeButton={false} render={<Link href={primary.href} />} size="lg" className="min-h-12 rounded-xl px-6 font-semibold shadow-md">
            {primary.label}<ArrowRight className="size-4" />
          </Button>
          {secondary ? (
            <Button nativeButton={false} render={<Link href={secondary.href} />} size="lg" variant="outline" className="min-h-12 rounded-xl px-6 font-semibold">
              {secondary.label}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function FeatureGrid({
  eyebrow,
  title,
  description,
  features,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  features: MarketingFeature[];
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          {description ? <p className="mt-4 leading-7 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ title: featureTitle, description: featureDescription, icon: Icon }) => (
            <article key={featureTitle} className="flex gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-bold">{featureTitle}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{featureDescription}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChecklistSection({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  items: string[];
}) {
  return (
    <section className="border-y border-border/60 bg-muted/25 py-16 sm:py-20">
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          {eyebrow ? <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p> : null}
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          {description ? <p className="mt-4 leading-7 text-muted-foreground">{description}</p> : null}
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl bg-background p-4 text-sm leading-6 shadow-sm ring-1 ring-border/70">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function MarketingCta({
  title,
  description,
  primary = { href: "/request-demo", label: "Request a School Demo" },
  secondary,
}: {
  title: string;
  description: string;
  primary?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="py-16 sm:py-20">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground shadow-xl sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-primary-foreground/80 sm:text-base">{description}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button nativeButton={false} render={<Link href={primary.href} />} size="lg" variant="secondary" className="min-h-12 rounded-xl px-6 font-semibold">
              {primary.label}<ArrowRight className="size-4" />
            </Button>
            {secondary ? (
              <Button nativeButton={false} render={<Link href={secondary.href} />} size="lg" variant="outline" className="min-h-12 rounded-xl border-primary-foreground/30 bg-transparent px-6 font-semibold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                {secondary.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
