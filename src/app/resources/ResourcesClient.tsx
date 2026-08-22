"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Globe2, ShieldCheck, ArrowRight } from "lucide-react";

type Preference = { board: string; qualification: string } | null;
type Qualification = { id: string; name: string; title: string };
type Board = { id: string; name: string; title: string; qualifications: Qualification[] };

export default function ResourcesClient({
  boards,
}: {
  initialPreference: Preference;
  boards: Board[];
}) {
  return (
    <div className="relative container px-4 md:px-8 py-14 max-w-4xl mx-auto min-h-[calc(100vh-140px)] flex flex-col justify-center">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-6 -z-10 mx-auto h-72 max-w-3xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Choose Your Ecosystem</h1>
        <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
          Select your academic board to access structured revision notes, topical questions, worksheets, and practice.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
        {boards.map((b) => {
          const isCambridge = b.name.toLowerCase().includes("cambridge");
          const isCbse = b.name.toLowerCase().includes("cbse");
          const Icon = isCambridge ? Globe2 : isCbse ? ShieldCheck : BookOpen;

          return (
            <Link key={b.id} href={`/resources/${b.name}`} className="group block focus-visible:outline-none">
              <Card
                className="h-full border border-border/80 hover:border-primary/50 transition-all duration-300 hover:shadow-xl group-hover:-translate-y-1 rounded-2xl bg-card overflow-hidden"
              >
                <CardContent className="p-7 sm:p-8 flex flex-col items-center text-center gap-4 h-full justify-between">
                  <div className="size-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm mt-2">
                    <Icon className="size-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight mb-2">{b.title}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {isCambridge ? "IGCSE, O Level, AS & A Level learning and revision resources." : isCbse ? "Class 9, Class 10, Class 11, and Class 12 resources." : "Custom curriculum and revision study material."}
                    </p>
                  </div>
                  <div className="w-full pt-4 mt-auto">
                    <div className="w-full h-10 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 transition-colors">
                      <span>Explore {b.title}</span>
                      <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
