import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentReflectionCard } from "../StudentReflectionCard";

export default function AskTeacherPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-8">
      <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ask Your Doubts</h1>
        <p className="mt-1 text-lg text-muted-foreground">Choose one of your subjects and send a focused question to your teacher.</p>
      </div>
      <StudentReflectionCard />
    </div>
  );
}
