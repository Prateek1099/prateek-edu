"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ResolveQueryButton from "./ResolveQueryButton";

type QueryItem = {
  id: string;
  name: string;
  email: string;
  message: string;
  resolved: boolean;
  createdAt: string;
};

export default function AdminQueriesClient({ queries }: { queries: QueryItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "resolved">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return queries.filter((item) => {
      if (statusFilter === "pending" && item.resolved) return false;
      if (statusFilter === "resolved" && !item.resolved) return false;
      if (
        query &&
        !`${item.name} ${item.email} ${item.message}`.toLowerCase().includes(query)
      ) return false;
      return true;
    });
  }, [queries, search, statusFilter]);

  const pendingCount = queries.filter((query) => !query.resolved).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contact Queries</h1>
        <p className="mt-1 text-muted-foreground">
          Read complete messages and track which enquiries still need a response.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium">
          {pendingCount} pending · {queries.length} total
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_180px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or message…"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value || "all") as "all" | "pending" | "resolved")
            }
          >
            <SelectTrigger aria-label="Filter contact queries by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">
          No contact queries match these filters.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contact</TableHead>
                  <TableHead className="min-w-[28rem]">Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((query) => (
                  <TableRow key={query.id}>
                    <TableCell>
                      <div className="font-medium">{query.name}</div>
                      <div className="text-xs text-muted-foreground">{query.email}</div>
                    </TableCell>
                    <TableCell className="max-w-2xl whitespace-pre-wrap break-words leading-6">{query.message}</TableCell>
                    <TableCell>
                      <Badge variant={query.resolved ? "outline" : "destructive"}>
                        {query.resolved ? "Resolved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(query.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {!query.resolved && <ResolveQueryButton queryId={query.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 xl:hidden">
            {filtered.map((query) => (
              <Card key={query.id} className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{query.name}</div>
                    <div className="break-all text-sm text-muted-foreground">{query.email}</div>
                  </div>
                  <Badge variant={query.resolved ? "outline" : "destructive"}>
                    {query.resolved ? "Resolved" : "Pending"}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-3 text-sm leading-6">
                  {query.message}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">{new Date(query.createdAt).toLocaleString()}</span>
                  {!query.resolved && <ResolveQueryButton queryId={query.id} />}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
