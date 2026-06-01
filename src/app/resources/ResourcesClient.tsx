"use client";

import { useState } from "react";
import Link from "next/link";
import { setEcosystemPreference, clearEcosystemPreference } from "@/app/actions/resources-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, LayoutDashboard, Settings2, BookOpen } from "lucide-react";

type Preference = { board: string; qualification: string } | null;
type Qualification = { id: string; name: string; title: string };
type Board = { id: string; name: string; title: string; qualifications: Qualification[] };

export default function ResourcesClient({
  initialPreference,
  boards,
}: {
  initialPreference: Preference;
  boards: Board[];
}) {
  return (
    <div className="container px-4 md:px-8 py-12 max-w-4xl mx-auto min-h-[calc(100vh-140px)]">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Choose Your Ecosystem</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Select your educational board to access tailored revision notes, topical questions, and past papers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {boards.map((b) => (
          <Link key={b.id} href={`/resources/${b.name}`}>
            <Card 
              className="cursor-pointer hover:border-primary transition-all hover:shadow-lg group h-full bg-card"
            >
              <CardContent className="p-8 flex flex-col items-center text-center gap-4 h-full justify-center">
                <div className="bg-primary/10 p-4 rounded-full group-hover:scale-110 transition-transform">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">{b.title}</h2>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
