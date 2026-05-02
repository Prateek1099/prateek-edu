export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import AdminPapersClient from "./AdminPapersClient";

export default async function AdminPapersPage() {
  const papers = await prisma.paper.findMany({
    orderBy: { year: 'desc' }
  });

  return <AdminPapersClient papers={papers} />;
}
