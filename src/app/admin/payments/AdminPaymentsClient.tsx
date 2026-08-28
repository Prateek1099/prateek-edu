"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin-date-format";
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

type PaymentItem = {
  id: string;
  userLabel: string;
  amount: number;
  status: string;
  purchase: string;
  purchaseType: "course" | "subscription" | "legacy";
  paymentId: string | null;
  createdAt: string;
};

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "successful") return "default";
  if (status === "failed") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

export default function AdminPaymentsClient({ payments }: { payments: PaymentItem[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`) : null;
    return payments.filter((payment) => {
      const created = new Date(payment.createdAt);
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (typeFilter !== "all" && payment.purchaseType !== typeFilter) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (
        query &&
        !`${payment.userLabel} ${payment.purchase} ${payment.paymentId ?? ""}`
          .toLowerCase()
          .includes(query)
      ) return false;
      return true;
    });
  }, [fromDate, payments, search, statusFilter, toDate, typeFilter]);

  const successfulRevenue = payments
    .filter((payment) => payment.status === "successful")
    .reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
        <p className="mt-1 text-muted-foreground">
          Read-only payment visibility across course and subscription purchases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Successful Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            ₹{successfulRevenue.toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payments shown</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{filtered.length}</CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_170px_160px_160px]">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search user, purchase, or payment ID…" />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
            <SelectTrigger aria-label="Filter payments by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value || "all")}>
            <SelectTrigger aria-label="Filter payments by purchase type"><SelectValue placeholder="All purchase types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All purchase types</SelectItem>
              <SelectItem value="course">Course</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="legacy">Legacy / unmapped</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} aria-label="Payments from date" />
          <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} aria-label="Payments to date" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">No payments match these filters.</div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.userLabel}</TableCell>
                    <TableCell className="font-medium tabular-nums">₹{payment.amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></TableCell>
                    <TableCell>
                      <div>{payment.purchase}</div>
                      <div className="text-xs capitalize text-muted-foreground">{payment.purchaseType}</div>
                    </TableCell>
                    <TableCell className="max-w-64 break-all font-mono text-xs">{payment.paymentId || "N/A"}</TableCell>
                    <TableCell>{formatAdminDate(payment.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {filtered.map((payment) => (
              <Card key={payment.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{payment.userLabel}</div>
                    <div className="text-sm text-muted-foreground">{payment.purchase}</div>
                  </div>
                  <Badge variant={statusVariant(payment.status)}>{payment.status}</Badge>
                </div>
                <div className="text-2xl font-bold">₹{payment.amount.toLocaleString("en-IN")}</div>
                <div className="break-all font-mono text-xs text-muted-foreground">{payment.paymentId || "No payment ID"}</div>
                <div className="text-xs text-muted-foreground">{formatAdminDateTime(payment.createdAt)}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
