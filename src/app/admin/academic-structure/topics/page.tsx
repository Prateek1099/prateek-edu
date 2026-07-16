export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import AdminTopicsClient from "./AdminTopicsClient";

export default async function AdminTopicsPage() {
  const topics = await prisma.topic.findMany({
    include: {
      subject: { 
        include: { 
          qualification: { include: { board: true } } 
        } 
      },
      _count: {
        select: { notes: true, challenges: true, bankQuestions: true }
      }
    },
    orderBy: [
      { subject: { qualification: { board: { title: "asc" } } } },
      { subject: { qualification: { sortOrder: "asc" } } },
      { subject: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { topicName: "asc" }
    ]
  });

  const subjects = await prisma.subject.findMany({
    include: { 
      qualification: { include: { board: true } }
    },
    orderBy: [
      { qualification: { board: { title: "asc" } } },
      { qualification: { sortOrder: "asc" } },
      { sortOrder: "asc" },
      { name: "asc" }
    ]
  });

  return <AdminTopicsClient topics={topics} subjects={subjects} />;
}
