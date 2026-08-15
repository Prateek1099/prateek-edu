"use client";

import * as React from "react"
import { Search, BookOpen, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface SubjectResult {
  id: string;
  name: string;
  code: string | null;
  slug: string;
  qualification: {
    name: string;
    title: string;
    board: { name: string };
  };
}

interface SearchResult { subjects: SubjectResult[] }

export function GlobalSearch({
  className,
  onOpen,
}: {
  className?: string
  onOpen?: () => void
} = {}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResult>({ subjects: [] })
  const router = useRouter()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (!query) {
      setResults({ subjects: [] })
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        if (res.ok) {
          setResults(data)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <button
        onClick={() => {
          onOpen?.()
          setOpen(true)
        }}
        className={cn(
          "inline-flex items-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-9 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-64 lg:w-80",
          className,
        )}
      >
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <span className="inline-flex">Search subjects...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput 
          placeholder="Type a subject or code (e.g., 'Computer Science' or '0478')..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              "No results found."
            )}
          </CommandEmpty>
          
          {results.subjects.length > 0 && (
            <CommandGroup heading="Subjects">
              {results.subjects.map((subject) => (
                <CommandItem
                  key={subject.id}
                  value={subject.name + subject.code}
                  onSelect={() => runCommand(() => router.push(`/resources/${subject.qualification.board.name}/${subject.qualification.name}/${subject.slug}`))}
                >
                  <BookOpen className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="font-medium">{subject.name} ({subject.code})</span>
                    <span className="text-xs text-muted-foreground">{subject.qualification.title}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

        </CommandList>
      </CommandDialog>
    </>
  )
}
