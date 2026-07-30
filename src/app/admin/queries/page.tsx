export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminQueriesClient from "./AdminQueriesClient";

export default async function AdminQueriesPage() {
  const queries = await prisma.contactQuery.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <AdminQueriesClient
      queries={queries.map((query) => ({
        id: query.id,
        name: query.name,
        email: query.email,
        message: query.message,
        resolved: query.resolved,
        createdAt: query.createdAt.toISOString(),
      }))}
    />
  );
}
