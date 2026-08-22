import { Building2, ClipboardCheck, MessagesSquare } from "lucide-react";
import { DemoRequestForm } from "@/components/marketing/DemoRequestForm";
import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Request a School Demo",
  description: "Request a managed Vexa demo for question banks, blueprint-based test paper generation, editable DOCX exports, and school learning resources.",
  path: "/request-demo",
});

export default function RequestDemoPage() {
  return (
    <div className="relative overflow-hidden py-14 sm:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-32 -z-10 mx-auto h-[32rem] max-w-6xl bg-gradient-to-b from-primary/15 to-transparent blur-3xl" />
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Managed access</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Request a School Demo</h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">See how Vexa can support question organization, blueprint-based papers, teacher answer keys, and editable exports for your school.</p>
          <div className="mt-9 space-y-6">
            {[
              [Building2, "Tell us about your school", "Share the board, classes, subjects, and teacher team you want to support."],
              [ClipboardCheck, "Review your workflow", "We will discuss your current question bank, paper pattern, and resource needs."],
              [MessagesSquare, "Plan a practical pilot", "If Vexa fits, we will outline a managed setup rather than promise instant unrestricted access."],
            ].map(([Icon, title, description]) => {
              const DemoIcon = Icon as typeof Building2;
              return <div key={String(title)} className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><DemoIcon className="size-5" /></div><div><h2 className="font-bold">{String(title)}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{String(description)}</p></div></div>;
            })}
          </div>
        </section>
        <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-xl sm:p-8" aria-labelledby="demo-form-title">
          <h2 id="demo-form-title" className="text-2xl font-bold">Tell us what you need</h2>
          <p className="mb-7 mt-2 text-sm leading-6 text-muted-foreground">We use these details only to respond to your enquiry and plan an appropriate demonstration.</p>
          <DemoRequestForm />
        </section>
      </div>
    </div>
  );
}
