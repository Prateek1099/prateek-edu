"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import DeleteUserButton from "./DeleteUserButton";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  createdAt: string;
  completedEnrollments: number;
  pendingEnrollments: number;
  disabledReason?: string;
  canViewPerformance: boolean;
};

function UserActions({ user }: { user: UserItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      {user.canViewPerformance && (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/admin/users/${user.id}/performance`} />}
        >
          Performance
        </Button>
      )}
      <DeleteUserButton
        userId={user.id}
        userName={user.name}
        disabledReason={user.disabledReason}
      />
    </div>
  );
}

export default function AdminUsersClient({ users }: { users: UserItem[] }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [enrollmentFilter, setEnrollmentFilter] = useState("all");

  const roles = useMemo(
    () => Array.from(new Set(users.map((user) => user.role))).sort(),
    [users]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (enrollmentFilter === "completed" && user.completedEnrollments === 0) return false;
      if (enrollmentFilter === "pending" && user.pendingEnrollments === 0) return false;
      if (
        query &&
        !`${user.name ?? ""} ${user.email ?? ""} ${user.role}`
          .toLowerCase()
          .includes(query)
      ) return false;
      return true;
    });
  }, [enrollmentFilter, roleFilter, search, users]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Review accounts, roles, enrollments, and protected deletion status.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium">
          {filtered.length} of {users.length} users
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_200px_210px]">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or role…"
          />
          <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value || "all")}>
            <SelectTrigger aria-label="Filter users by role">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>{role.replaceAll("_", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={enrollmentFilter} onValueChange={(value) => setEnrollmentFilter(value || "all")}>
            <SelectTrigger aria-label="Filter users by enrollment status">
              <SelectValue placeholder="All enrollments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All enrollments</SelectItem>
              <SelectItem value="completed">Has completed enrollment</SelectItem>
              <SelectItem value="pending">Has pending enrollment</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">
          No users match these filters.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.name || "Unnamed user"}</div>
                      <div className="text-xs text-muted-foreground">{user.email || "No email"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role.includes("ADMIN") ? "destructive" : "secondary"}>
                        {user.role.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{user.completedEnrollments} completed</div>
                      {user.pendingEnrollments > 0 && (
                        <div className="text-xs text-amber-600">{user.pendingEnrollments} pending</div>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell><UserActions user={user} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {filtered.map((user) => (
              <Card key={user.id} className="space-y-4 p-4">
                <div>
                  <div className="font-semibold">{user.name || "Unnamed user"}</div>
                  <div className="break-all text-sm text-muted-foreground">{user.email || "No email"}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={user.role.includes("ADMIN") ? "destructive" : "secondary"}>
                    {user.role.replaceAll("_", " ")}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  {user.completedEnrollments} completed enrollment(s)
                  {user.pendingEnrollments > 0 && (
                    <div className="mt-1 text-amber-600">{user.pendingEnrollments} pending</div>
                  )}
                </div>
                <UserActions user={user} />
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
