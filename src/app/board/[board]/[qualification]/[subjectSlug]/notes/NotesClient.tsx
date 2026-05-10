"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Folder, Search, StickyNote, ChevronRight, ExternalLink } from "lucide-react";

type NoteRow = {
  id: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topic: { id: string; topicName: string } | null;
};

const TOPIC_ALL = "all";
const WHOLE_SUBJECT_LABEL = "Whole subject";

function topicLabel(note: NoteRow): string {
  return note.topic?.topicName ?? WHOLE_SUBJECT_LABEL;
}

function compareTopicSections(
  a: string,
  b: string,
  syllabusTopicOrder: readonly string[]
): number {
  if (a === WHOLE_SUBJECT_LABEL && b === WHOLE_SUBJECT_LABEL) return 0;
  if (a === WHOLE_SUBJECT_LABEL) return -1;
  if (b === WHOLE_SUBJECT_LABEL) return 1;

  const index = new Map(syllabusTopicOrder.map((name, i) => [name, i]));
  const ia = index.has(a) ? (index.get(a) as number) : Number.MAX_SAFE_INTEGER;
  const ib = index.has(b) ? (index.get(b) as number) : Number.MAX_SAFE_INTEGER;
  if (ia !== ib) return ia - ib;
  return a.localeCompare(b);
}

export default function NotesClient({
  initialNotes,
  syllabusTopicOrder = [],
}: {
  initialNotes: NoteRow[];
  /** Topic names from DB in syllabus sequence (seeded curriculum). Empty = alphabetical fallback. */
  syllabusTopicOrder?: readonly string[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>(TOPIC_ALL);

  const topicOptions = useMemo(() => {
    const uniq = new Set<string>();
    syllabusTopicOrder.forEach((t) => uniq.add(t));
    initialNotes.forEach((n) => uniq.add(topicLabel(n)));

    return Array.from(uniq).sort((a, b) =>
      compareTopicSections(a, b, syllabusTopicOrder)
    );
  }, [initialNotes, syllabusTopicOrder]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return initialNotes.filter((n) => {
      const label = topicLabel(n);
      const matchTopic = topicFilter === TOPIC_ALL || label === topicFilter;
      if (!matchTopic) return false;
      if (!q) return true;
      const inTitle = n.title.toLowerCase().includes(q);
      const inBody = (n.content ?? "").toLowerCase().includes(q);
      const inTopic = label.toLowerCase().includes(q);
      return inTitle || inBody || inTopic;
    });
  }, [initialNotes, searchQuery, topicFilter]);

  const grouped = useMemo(() => {
    return filteredNotes.reduce(
      (acc, note) => {
        const key = topicLabel(note);
        if (!acc[key]) acc[key] = [];
        acc[key].push(note);
        return acc;
      },
      {} as Record<string, NoteRow[]>
    );
  }, [filteredNotes]);

  const sortedKeys = Object.keys(grouped).sort((a, b) =>
    compareTopicSections(a, b, syllabusTopicOrder)
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-2">
      <aside className="w-full md:w-64 shrink-0 space-y-6">
        <div className="sticky top-24">
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Filter notes
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Title or keywords…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {topicOptions.length > 1 && (
              <div className="space-y-2">
                <Label>Topic</Label>
                <Select
                  value={topicFilter}
                  onValueChange={(v) => setTopicFilter(v || TOPIC_ALL)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TOPIC_ALL}>All topics</SelectItem>
                    {topicOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTopicFilter(TOPIC_ALL);
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground pb-4 border-b">
          <span>Results</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"}
          </span>
        </div>

        {sortedKeys.length === 0 ? (
          <div className="text-center py-24 bg-muted/30 rounded-lg border border-dashed">
            <StickyNote className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">No revision notes yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-1">
              Check back soon — notes for this subject will appear here once they are published.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {sortedKeys.map((groupKey) => (
              <Card
                key={groupKey}
                className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted"
              >
                <CardHeader className="p-4 bg-muted/30 border-b flex flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-bold truncate">{groupKey}</CardTitle>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-medium">
                    {grouped[groupKey].length}{" "}
                    {grouped[groupKey].length === 1 ? "note" : "notes"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="flex flex-col divide-y divide-border">
                    {grouped[groupKey].map((note) => (
                      <li
                        key={note.id}
                        className="p-5 md:p-6 hover:bg-muted/10 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          <div className="space-y-2 min-w-0 flex-1">
                            <h4 className="font-semibold text-lg text-foreground leading-snug">
                              {note.title}
                            </h4>
                            {note.content && (
                              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                                {note.content}
                              </p>
                            )}
                          </div>
                          {note.pdfUrl && (
                            <div className="shrink-0">
                              <a
                                href={note.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  buttonVariants({ variant: "default", size: "sm" }),
                                  "gap-2 shadow-sm inline-flex items-center"
                                )}
                              >
                                <FileText className="h-4 w-4" />
                                PDF
                                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                              </a>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
