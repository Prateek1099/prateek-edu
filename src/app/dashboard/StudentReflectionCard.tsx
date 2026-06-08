"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Info, BookOpen, Trophy } from "lucide-react";

export type AskTeacherContext = {
  source: string;
  topic?: string;
  mistakes?: number;
  challengeName?: string;
  score?: number;
  reasons?: string[];
};

type Props = {
  prefillContext?: AskTeacherContext;
  onSuccess?: () => void;
};

const CATEGORIES = ["Theory", "Paper 2", "Paper 3"];

const REASONS = [
  "I don't understand this topic",
  "I keep making mistakes in this topic",
  "I need more practice questions",
  "I am not confident about exam questions from this topic"
];

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

export function StudentReflectionCard({ prefillContext, onSuccess }: Props = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleReason = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSelectedTopics([]); // reset topics when category changes
  };

  const handleSubmit = async () => {
    if (selectedTopics.length === 0 && !message.trim() && selectedReasons.length === 0 && !prefillContext) {
      toast.error("Please select a topic or write your doubt.");
      return;
    }

    if (selectedReasons.length === 0 && !message.trim()) {
      toast.error("Please select a reason or write a message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const challengingTopics = prefillContext?.topic 
        ? [prefillContext.topic]
        : selectedTopics.map(t => `${selectedCategory}: ${t}`);
      
      const finalContext = prefillContext 
        ? { ...prefillContext, reasons: selectedReasons } 
        : { reasons: selectedReasons };

      const res = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          challengingTopics, 
          message,
          context: finalContext
        })
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
      toast.success("Doubt sent to your teacher!");
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error("Failed to send doubt");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card id="ask-teacher" className="bg-card shadow-sm border-border">
        <CardContent className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <p className="font-medium text-foreground">Doubt Sent Successfully!</p>
          <p className="text-sm">Your teacher will review this and get back to you soon.</p>
          <Button variant="outline" size="sm" onClick={() => { setSubmitted(false); setSelectedCategory(null); setSelectedTopics([]); setMessage(""); }} className="mt-4">
            Ask another doubt
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="ask-teacher" className="bg-card shadow-sm border-border scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
           Ask Your Doubts
        </CardTitle>
        <CardDescription>Stuck on something? Let your teacher know.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {prefillContext ? (
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Context Included</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {prefillContext.source === "Mistake Book" && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  <BookOpen className="w-3 h-3 mr-1" /> Mistake Book
                </Badge>
              )}
              {prefillContext.source === "Challenge Results" && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  <Trophy className="w-3 h-3 mr-1" /> Challenge Results
                </Badge>
              )}
              {prefillContext.topic && (
                <Badge variant="secondary">Topic: {prefillContext.topic}</Badge>
              )}
              {prefillContext.challengeName && (
                <Badge variant="secondary">Challenge: {prefillContext.challengeName}</Badge>
              )}
              {prefillContext.score !== undefined && (
                <Badge variant="outline" className="border-red-500/30 text-red-500">Score: {prefillContext.score}%</Badge>
              )}
              {prefillContext.mistakes !== undefined && prefillContext.mistakes > 0 && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-500">{prefillContext.mistakes} Mistakes</Badge>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Select Category */}
            <div className="space-y-2">
          <label className="text-sm font-semibold">1. Select Paper Type</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <Button 
                key={cat} 
                type="button" 
                variant={selectedCategory === cat ? "default" : "outline"} 
                size="sm"
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Topics (if category selected) */}
        {selectedCategory && (
          <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-semibold">2. Select Topics</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TOPICS[selectedCategory as keyof typeof TOPICS].map((topic, i) => (
                <div key={i} className="flex items-center space-x-2 border rounded-md p-2 hover:bg-muted/30 transition-colors">
                  <Checkbox 
                    id={`topic-${i}`} 
                    checked={selectedTopics.includes(topic)}
                    onCheckedChange={() => toggleTopic(topic)}
                  />
                  <label htmlFor={`topic-${i}`} className="text-sm font-medium leading-tight cursor-pointer flex-1">
                    {topic}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}

        {/* Reasons Checkboxes */}
        <div className="space-y-3 mt-4">
          <label className="text-sm font-semibold">{prefillContext ? "What kind of help do you need?" : "3. What kind of help do you need?"}</label>
          <div className="grid grid-cols-1 gap-2">
            {REASONS.map((reason, i) => (
              <div key={`reason-${i}`} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/30 transition-colors">
                <Checkbox 
                  id={`reason-${i}`} 
                  checked={selectedReasons.includes(reason)}
                  onCheckedChange={() => toggleReason(reason)}
                />
                <label htmlFor={`reason-${i}`} className="text-sm font-medium leading-tight cursor-pointer flex-1">
                  {reason}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Doubt text area */}
        <div className="space-y-2 mt-4">
          <label className="text-sm font-semibold">{prefillContext ? "Any specific questions? (Optional)" : "4. Mention the particular topic / Doubt (Optional)"}</label>
          <Textarea 
            placeholder="Explain what you are struggling with..." 
            className="resize-none h-24 text-sm"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || (!prefillContext && !selectedCategory) || (selectedReasons.length === 0 && !message.trim())}
          className="w-full mt-2"
        >
          Send to Teacher
        </Button>
      </CardContent>
    </Card>
  );
}
