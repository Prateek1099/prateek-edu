"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit query");
      }

      setSuccess(true);
      (e.target as HTMLFormElement).reset();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit query";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative container px-4 md:px-8 py-10 md:py-16 max-w-6xl mx-auto space-y-12 min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-80 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
          Get in <span className="bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent">Touch</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed">
          Have a question about our learning resources, or need help? Our team is always here for you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-2xs mb-3">
              <Mail className="size-6" />
            </div>
            <CardTitle className="text-base sm:text-lg font-bold">Email Us</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">We usually reply within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs sm:text-sm font-semibold text-foreground">
            support.vexaonline@gmail.com
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-2xs mb-3">
              <Phone className="size-6" />
            </div>
            <CardTitle className="text-base sm:text-lg font-bold">Call Us</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Mon–Fri from 2pm to 7pm.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs sm:text-sm font-semibold text-foreground">
            +91 7014769931
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:border-primary/40 transition-all">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-2xs mb-3">
              <MapPin className="size-6" />
            </div>
            <CardTitle className="text-base sm:text-lg font-bold">Office</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Visit our office in Jodhpur.</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-xs sm:text-sm font-semibold text-foreground">
            iStart Nest Incubation Center, Jodhpur
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-2xl mx-auto rounded-2xl border border-border/80 bg-card shadow-xl">
        <CardHeader className="p-6 sm:p-8 pb-4">
          <CardTitle className="text-xl sm:text-2xl font-extrabold tracking-tight">Send a Message</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground">
            Fill out the form below and we will get back to you promptly.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 sm:p-8 pt-0">
          {success ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-center text-xs sm:text-sm font-semibold">
              Thank you for reaching out! We have received your message and will contact you shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold rounded-xl">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input id="name" name="name" placeholder="Rohan Sharma" className="rounded-xl h-10 bg-background border-border/80" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="rohan@example.com" className="rounded-xl h-10 bg-background border-border/80" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</Label>
                <Input id="subject" name="subject" placeholder="How can we help you?" className="rounded-xl h-10 bg-background border-border/80" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Message</Label>
                <Textarea id="message" name="message" placeholder="Type your message here..." className="min-h-[130px] rounded-xl bg-background border-border/80 resize-none text-xs sm:text-sm" required />
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl text-xs sm:text-sm font-semibold shadow-md" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
