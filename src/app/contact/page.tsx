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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 py-12 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Get in <span className="text-primary">Touch</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          Have a question about our courses, learning resources, or need technical support? We&apos;re here to help!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-muted/10 border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Email Us</CardTitle>
            <CardDescription>We usually reply within 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="text-center font-medium">
            support@
          </CardContent>
        </Card>

        <Card className="bg-muted/10 border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Call Us</CardTitle>
            <CardDescription>Mon-Fri from 8am to 5pm.</CardDescription>
          </CardHeader>
          <CardContent className="text-center font-medium">
            +91 7014769931
          </CardContent>
        </Card>

        <Card className="bg-muted/10 border-primary/10">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Office</CardTitle>
            <CardDescription>Visit our Office for any queries.</CardDescription>
          </CardHeader>
          <CardContent className="text-center font-medium">
            iStart Nest Incubation Center, Vikramaditya Nagar, Jodhpur
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-2xl mx-auto border-primary/10 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Send a Message</CardTitle>
          <CardDescription>Fill out the form below and we will get back to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg text-center font-medium">
              Thank you for reaching out! We have received your message and will contact you shortly.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" placeholder="Rohan Sharma" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="rohan@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" placeholder="How can we help you?" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" placeholder="Type your message here..." className="min-h-[150px]" required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
