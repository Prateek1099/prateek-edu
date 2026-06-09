import { prisma } from "@/lib/prisma";
import { rejectIfNotAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";
import AdminSyllabusClient from "./AdminSyllabusClient";

export const dynamic = "force-dynamic";

export default async function AdminSyllabusPage() {
  const denied = await rejectIfNotAdmin();
  if (denied) redirect("/dashboard");

  const subjects = await prisma.subject.findMany({
    include: {
      qualification: {
        include: {
          board: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return <AdminSyllabusClient subjects={subjects} />;
}
