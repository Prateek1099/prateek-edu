"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const interests = [
  "Question Bank and Paper Builder",
  "School pilot",
  "Student learning resources",
  "Custom content and onboarding",
];

export function DemoRequestForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const interest = String(form.get("interest") || "School demo");
    const organization = String(form.get("organization") || "Not provided");
    const role = String(form.get("role") || "Not provided");
    const phone = String(form.get("phone") || "Not provided");
    const note = String(form.get("message") || "No additional message");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          subject: `School demo request — ${interest}`,
          message: `Organization: ${organization}\nRole: ${role}\nPhone: ${phone}\nInterest: ${interest}\n\n${note}`,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not submit your request");
      }

      setSuccess(true);
      event.currentTarget.reset();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Could not submit your request");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
        <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Request received</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Thank you. The Vexa team will contact you to discuss your school or teacher requirements.</p>
        <Button type="button" variant="outline" className="mt-5 rounded-xl" onClick={() => setSuccess(false)}>Send another request</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" aria-label="School demo request">
      {error ? <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" placeholder="Your full name" required />
        <Field label="Work email" name="email" type="email" placeholder="name@school.edu" required />
        <Field label="School or organization" name="organization" placeholder="School name" required />
        <Field label="Your role" name="role" placeholder="Teacher, coordinator, principal…" required />
        <Field label="Phone (optional)" name="phone" type="tel" placeholder="Contact number" />
        <div className="space-y-2">
          <Label htmlFor="interest">Interest area</Label>
          <select id="interest" name="interest" className="flex min-h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" defaultValue={interests[0]}>
            {interests.map((interest) => <option key={interest}>{interest}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="demo-message">What would you like Vexa to help with?</Label>
        <Textarea id="demo-message" name="message" className="min-h-32 rounded-xl" placeholder="Tell us about your subjects, teachers, paper workflow, or resource requirements." />
      </div>
      <Button type="submit" size="lg" className="min-h-12 w-full rounded-xl font-semibold" disabled={loading}>
        {loading ? "Sending request…" : "Request a School Demo"}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Vexa teacher and school access is currently offered through demos, pilots, and managed rollout.</p>
    </form>
  );
}

function Field({ label, name, placeholder, type = "text", required = false }: { label: string; name: string; placeholder: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} placeholder={placeholder} required={required} className="min-h-11 rounded-xl" />
    </div>
  );
}
