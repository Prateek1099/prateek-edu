"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, Check, XCircle, RotateCcw, Eye } from "lucide-react";
import { approveWorkspace, suspendWorkspace, reactivateWorkspace } from "@/app/actions/workspace";
import { toast } from "sonner";
import Link from "next/link";

type WorkspaceItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: Date | string;
  owner: { id: string; name: string | null; email: string | null };
  _count: { classes: number; members: number };
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed";
}

export default function AdminWorkspacesClient({ workspaces }: { workspaces: WorkspaceItem[] }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" ? workspaces : workspaces.filter((w) => w.status === filter);

  const handleApprove = async (id: string) => {
    try {
      await approveWorkspace(id);
      toast.success("Workspace approved");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await suspendWorkspace(id);
      toast.success("Workspace suspended");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await reactivateWorkspace(id);
      toast.success("Workspace reactivated");
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-emerald-600 hover:bg-emerald-700";
      case "PENDING_APPROVAL": return "bg-amber-600 hover:bg-amber-700";
      case "SUSPENDED": return "bg-red-600 hover:bg-red-700";
      case "ARCHIVED": return "bg-slate-600 hover:bg-slate-700";
      default: return "";
    }
  };

  const pendingCount = workspaces.filter((w) => w.status === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Briefcase className="size-8 text-primary" />
            Workspaces
            {pendingCount > 0 && (
              <span className="text-sm font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Manage teacher workspaces.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "ARCHIVED"].map((s) => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
              {s === "all" ? "All" : s === "PENDING_APPROVAL" ? "Pending" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">All Workspaces</CardTitle>
          <CardDescription>Teacher workspaces and their approval status.</CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                    No workspaces found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((ws) => (
                  <TableRow key={ws.id}>
                    <TableCell className="font-medium">{ws.name}</TableCell>
                    <TableCell>
                      <div>{ws.owner.name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">{ws.owner.email}</div>
                    </TableCell>
                    <TableCell>{ws._count.classes}</TableCell>
                    <TableCell>{ws._count.members}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(ws.status)}>
                        {ws.status === "PENDING_APPROVAL" ? "Pending" : ws.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/admin/workspaces/${ws.id}`} />}
                        title="View workspace"
                      >
                        <Eye className="size-4" />
                        <span className="sr-only">View workspace</span>
                      </Button>
                      {ws.status === "PENDING_APPROVAL" && (
                        <Button variant="outline" size="sm" onClick={() => handleApprove(ws.id)} className="text-emerald-600 hover:text-emerald-700">
                          <Check className="size-4" />
                        </Button>
                      )}
                      {ws.status === "ACTIVE" && (
                        <Button variant="ghost" size="sm" onClick={() => handleSuspend(ws.id)} className="text-destructive">
                          <XCircle className="size-4" />
                        </Button>
                      )}
                      {(ws.status === "SUSPENDED" || ws.status === "ARCHIVED") && (
                        <Button variant="outline" size="sm" onClick={() => handleReactivate(ws.id)}>
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
