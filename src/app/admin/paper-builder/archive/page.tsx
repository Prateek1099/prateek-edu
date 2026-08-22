import Link from "next/link";

import { PaperBuilderModeNav } from "@/components/paper-builder/PaperBuilderModeNav";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

import ArchiveClient from "./ArchiveClient";
import { listSavedGeneratedPapers } from "./actions";

export const dynamic = "force-dynamic";
type Params = Record<string, string | string[] | undefined>;
function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }

export default async function PaperArchivePage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const status = one(query.status) === "archived" ? "archived" as const : "active" as const;
  const filters = { status, search: one(query.search), boardId: one(query.boardId), qualificationId: one(query.qualificationId), subjectId: one(query.subjectId), dateFrom: one(query.dateFrom), dateTo: one(query.dateTo) };
  const [papers, subjects] = await Promise.all([
    listSavedGeneratedPapers(filters),
    prisma.subject.findMany({ include: { qualification: { include: { board: true } } }, orderBy: [{ qualification: { board: { title: "asc" } } }, { qualification: { title: "asc" } }, { name: "asc" }] }),
  ]);
  const boards = [...new Map(subjects.map((subject) => [subject.qualification.board.id, subject.qualification.board])).values()];
  const qualifications = [...new Map(subjects.filter((subject) => !filters.boardId || subject.qualification.board.id === filters.boardId).map((subject) => [subject.qualification.id, subject.qualification])).values()];
  const filteredSubjects = subjects.filter((subject) => (!filters.boardId || subject.qualification.board.id === filters.boardId) && (!filters.qualificationId || subject.qualification.id === filters.qualificationId));

  return (
    <div className="space-y-8">
      <header className="max-w-4xl"><h1 className="text-3xl font-bold tracking-tight">Paper Archive</h1><p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">Reopen exact, immutable Blueprint Builder papers and reproduce their previews, answer keys, print output, and DOCX exports.</p></header>
      <PaperBuilderModeNav mode="archive" />
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/paper-builder/archive?status=active" className={buttonVariants({ variant: status === "active" ? "default" : "outline" })}>Active papers</Link>
        <Link href="/admin/paper-builder/archive?status=archived" className={buttonVariants({ variant: status === "archived" ? "default" : "outline" })}>Archived papers</Link>
      </div>
      <form className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4">
        <input type="hidden" name="status" value={status} />
        <label className="space-y-1 text-sm"><span className="font-medium">Search</span><Input name="search" defaultValue={filters.search} placeholder="Name, description, subject" /></label>
        <NativeSelect name="boardId" label="Board" value={filters.boardId} options={boards.map((board) => ({ id: board.id, label: board.title }))} />
        <NativeSelect name="qualificationId" label="Qualification / class" value={filters.qualificationId} options={qualifications.map((item) => ({ id: item.id, label: item.title }))} />
        <NativeSelect name="subjectId" label="Subject" value={filters.subjectId} options={filteredSubjects.map((subject) => ({ id: subject.id, label: subject.name }))} />
        <label className="space-y-1 text-sm"><span className="font-medium">From date</span><Input type="date" name="dateFrom" defaultValue={filters.dateFrom} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">To date</span><Input type="date" name="dateTo" defaultValue={filters.dateTo} /></label>
        <div className="flex items-end"><Button type="submit">Apply filters</Button></div>
      </form>
      <ArchiveClient papers={papers} />
    </div>
  );
}

function NativeSelect({ name, label, value, options }: { name: string; label: string; value: string; options: Array<{ id: string; label: string }> }) {
  return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><select name={name} defaultValue={value} className="h-9 w-full rounded-md border bg-background px-3 text-sm"><option value="">All</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}
