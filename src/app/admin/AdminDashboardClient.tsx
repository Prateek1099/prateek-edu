"use client";

import { useAdminBoard } from "@/components/AdminBoardContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, IndianRupee, Bot, ShieldAlert, StickyNote, Database } from "lucide-react";

interface DashboardProps {
  userCount: number;
  premiumUsers: number;
  totalRevenue: number;
  totalAIUsage: number;
  failedPayments: number;
  boardStats: {
    name: string;
    notes: number;
    questions: number;
  }[];
}

export default function AdminDashboardClient({
  userCount,
  premiumUsers,
  totalRevenue,
  totalAIUsage,
  failedPayments,
  boardStats,
}: DashboardProps) {
  const { selectedBoard } = useAdminBoard();
  const premiumConversion = userCount > 0 ? ((premiumUsers / userCount) * 100).toFixed(1) : "0";

  const stats = selectedBoard === "all" 
    ? {
        notes: boardStats.reduce((sum, b) => sum + b.notes, 0),
        questions: boardStats.reduce((sum, b) => sum + b.questions, 0),
      }
    : boardStats.find((b) => b.name === selectedBoard) || { notes: 0, questions: 0 };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Overview {selectedBoard !== "all" && `— ${selectedBoard}`}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Premium Members</CardTitle>
            <Crown className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{premiumUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {premiumConversion}% Conversion Rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue (MRR)</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalRevenue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">AI Tokens</CardTitle>
            <Bot className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAIUsage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Failed Payments</CardTitle>
            <ShieldAlert className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedPayments}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold tracking-tight mt-8">Content Overview</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Revision Notes</CardTitle>
            <StickyNote className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Question Bank</CardTitle>
            <Database className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.questions}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
