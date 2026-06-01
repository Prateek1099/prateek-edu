"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquarePlus, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["Theory", "Paper 2", "Paper 3"];

const TOPICS = {
  "Theory": [
    "1 Types and components of computer systems",
    "2 Input and output devices",
    "3 Storage devices and media",
    "4 Networks and the effects of using them",
    "5 The effects of using IT",
    "6 ICT applications",
    "7 The systems life cycle",
    "8 Safety and security",
    "9 Audience",
    "10 Communication"
  ],
  "Paper 2": [
    "Document Production",
    "Databases",
    "Presentation"
  ],
  "Paper 3": [
    "Spreadsheets",
    "Website Authoring"
  ]
};

export default function AskTeacherPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedTopics([]);
  };

  const handleSubmit = async () => {
    if (selectedTopics.length === 0 && !message.trim()) {
      toast.error("Please select a topic or write your doubt.");
      return;
    }

    setIsSubmitting(true);
    try {
      const challengingTopics = selectedTopics.map(t => `${selectedCategory}: ${t}`);
      
      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengingTopics, message })
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      toast.success("Doubt sent to your teacher!");
    } catch (e) {
      toast.error("Failed to send doubt");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container px-4 md:px-8 py-8 max-w-4xl mx-auto space-y-6">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ask Your Doubts</h1>
          <p className="text-muted-foreground mt-1 text-lg">Stuck on something? Let your teacher know directly.</p>
        </div>
      </div>

      {submitted ? (
        <Card className="bg-card shadow-sm border-border py-12">
          <CardContent className="text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2">
              <MessageSquarePlus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Doubt Sent Successfully!</h2>
            <p className="text-muted-foreground max-w-md">Your teacher will review this and get back to you soon. Keep up the great work!</p>
            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={() => { setSubmitted(false); setSelectedCategory(null); setSelectedTopics([]); setMessage(""); }}>
                Ask another doubt
              </Button>
              <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
                Return to Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card shadow-md border-border max-w-3xl">
          <CardContent className="p-6 md:p-8 space-y-8">
            
            {/* Step 1 */}
            <div className="space-y-4">
              <label className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">1</span> 
                Select Paper Type
              </label>
              <div className="flex flex-wrap gap-3">
                {CATEGORIES.map(cat => (
                  <Button 
                    key={cat} 
                    type="button" 
                    variant={selectedCategory === cat ? "default" : "outline"} 
                    className={selectedCategory === cat ? "px-6 py-5 shadow-sm" : "px-6 py-5"}
                    onClick={() => handleCategorySelect(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Step 2 */}
            {selectedCategory && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">2</span> 
                  Select Topics
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOPICS[selectedCategory as keyof typeof TOPICS].map((topic, i) => (
                    <div key={i} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleTopic(topic)}>
                      <Checkbox 
                        id={`topic-${i}`} 
                        checked={selectedTopics.includes(topic)}
                        onCheckedChange={() => toggleTopic(topic)}
                      />
                      <label htmlFor={`topic-${i}`} className="text-sm font-medium leading-snug cursor-pointer flex-1">
                        {topic}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3 */}
            <div className="space-y-4">
              <label className="text-lg font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-sm">3</span> 
                Mention the particular topic / Doubt
              </label>
              <Textarea 
                placeholder="Explain what you are struggling with in detail..." 
                className="resize-none h-32 text-base p-4"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                size="lg"
                onClick={handleSubmit} 
                disabled={isSubmitting || (!selectedCategory) || (selectedTopics.length === 0 && !message.trim())}
                className="w-full sm:w-auto px-8"
              >
                Send to Teacher
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
