import Link from "next/link";
import { ChevronLeft, HelpCircle } from "lucide-react";
import { StudentReflectionCard } from "../StudentReflectionCard";

export default function AskTeacherPage() {
  return (
    <div className="relative container mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8 min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div>
        <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5">
          <ChevronLeft className="size-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex items-start gap-3.5">
        <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm mt-0.5">
          <HelpCircle className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ask Your Doubts</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Choose one of your subjects and send a focused question directly to your teacher.
          </p>
        </div>
      </div>

      <StudentReflectionCard />
    </div>
  );
}
