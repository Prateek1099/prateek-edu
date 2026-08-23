"use client";

import * as React from "react";
import {
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  PUBLIC_SEARCH_GROUP_KEYS,
  createEmptyPublicSearchGroups,
  normalizeSearchText,
  type PublicSearchGroupKey,
  type PublicSearchResponse,
  type PublicSearchResult,
  type PublicSearchResultType,
} from "@/lib/public-search";

const GROUP_HEADINGS: Record<PublicSearchGroupKey, string> = {
  subjects: "Subjects & study paths",
  topics: "Topics / Chapters",
  notes: "Notes",
  worksheets: "Worksheets",
  topicals: "Topical Questions",
  challenges: "Practice Challenges",
  courses: "Courses",
};

const TYPE_LABELS: Record<PublicSearchResultType, string> = {
  BOARD: "Board",
  QUALIFICATION: "Class",
  SUBJECT: "Subject",
  TOPIC: "Topic",
  NOTE: "Note",
  WORKSHEET: "Worksheet",
  TOPICAL_QUESTION: "Topical",
  PRACTICE_CHALLENGE: "Practice",
  COURSE: "Course",
};

export function GlobalSearchTrigger({
  className,
  onClick,
}: {
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={cn(
        "relative inline-flex h-9 w-full items-center justify-start gap-2 whitespace-nowrap rounded-[0.5rem] border border-input bg-muted/50 px-4 py-2 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:pr-12 md:w-64 lg:w-80",
        className,
      )}
    >
      <Search className="mr-2 size-4 shrink-0 opacity-50" />
      <span>Search resources...</span>
      <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: PublicSearchResult;
  onSelect: (href: string) => void;
}) {
  return (
    <CommandItem
      value={`${result.type}:${result.id}`}
      onSelect={() => onSelect(result.href)}
      className="items-start gap-3 py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{result.title}</span>
          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
            {TYPE_LABELS[result.type]}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
          {result.context}
        </p>
      </div>
    </CommandItem>
  );
}

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState<PublicSearchResponse>({
    query: "",
    groups: createEmptyPublicSearchGroups(),
  });
  const latestRequest = React.useRef(0);
  const router = useRouter();

  React.useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onOpenChange, open]);

  React.useEffect(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!open || normalizedQuery.length < 2) {
      latestRequest.current += 1;
      setLoading(false);
      setError("");
      setResults({ query: normalizedQuery, groups: createEmptyPublicSearchGroups() });
      return;
    }

    const controller = new AbortController();
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setError("");

    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as PublicSearchResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "Search failed");
        if (latestRequest.current === requestId) setResults(data);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError" && latestRequest.current === requestId) {
          setError("Search is temporarily unavailable. Please try again.");
          setResults({ query: normalizedQuery, groups: createEmptyPublicSearchGroups() });
        }
      } finally {
        if (latestRequest.current === requestId) setLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const hasResults = PUBLIC_SEARCH_GROUP_KEYS.some(
    (groupKey) => results.groups[groupKey].length > 0,
  );
  const normalizedQuery = normalizeSearchText(query);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        latestRequest.current += 1;
        setQuery("");
        setLoading(false);
        setError("");
        setResults({ query: "", groups: createEmptyPublicSearchGroups() });
      }
    },
    [onOpenChange],
  );

  const openResult = React.useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [handleOpenChange, router],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      title="Search Vexa learning resources"
      description="Search published subjects, chapters, notes, worksheets, topicals, practice, and courses."
      className="top-4 max-h-[calc(100vh-2rem)] translate-y-0 sm:top-1/4 sm:max-w-xl"
    >
      <CommandInput
        autoFocus
        placeholder="Search topics or resources, for example Pandas or SQL..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[min(70vh,32rem)]">
        {normalizedQuery.length < 2 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Enter at least 2 characters to search public learning resources.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Searching Vexa resources...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-center text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        ) : !hasResults ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium">No public resources found.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a subject, chapter, resource type, or a related term.
            </p>
          </div>
        ) : (
          PUBLIC_SEARCH_GROUP_KEYS.map((groupKey) => {
            const groupResults = results.groups[groupKey];
            if (groupResults.length === 0) return null;

            return (
              <CommandGroup
                key={groupKey}
                heading={GROUP_HEADINGS[groupKey]}
                className="border-b border-border/60 py-1 last:border-b-0"
              >
                {groupResults.map((result) => (
                  <SearchResultItem
                    key={`${groupKey}:${result.type}:${result.id}`}
                    result={result}
                    onSelect={openResult}
                  />
                ))}
              </CommandGroup>
            );
          })
        )}
      </CommandList>
    </CommandDialog>
  );
}
