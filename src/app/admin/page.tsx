import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
  const [
    userCount, 
    premiumUsers, 
    successfulPayments,
    failedPayments,
    aiUsageData,
    boards
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.payment.findMany({ where: { status: "successful" } }),
    prisma.payment.count({ where: { status: "failed" } }),
    prisma.user.aggregate({
      _sum: { usageConsumed: true }
    }),
    prisma.board.findMany()
  ]);

  const boardStats = await Promise.all(
    boards.map(async (b) => {
      const papers = await prisma.paper.count({ where: { subject: { qualification: { boardId: b.id } } } });
      const notes = await prisma.note.count({ where: { subject: { qualification: { boardId: b.id } } } });
      const questions = await prisma.bankQuestion.count({ where: { subject: { qualification: { boardId: b.id } } } });
      return { name: b.name, papers, notes, questions };
    })
  );

  const totalRevenue = successfulPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalAIUsage = aiUsageData._sum.usageConsumed || 0;
  
  return (
    <AdminDashboardClient
      userCount={userCount}
      premiumUsers={premiumUsers}
      totalRevenue={totalRevenue}
      totalAIUsage={totalAIUsage}
      failedPayments={failedPayments}
      boardStats={boardStats}
    />
  );
}
