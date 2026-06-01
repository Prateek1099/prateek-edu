import { prisma } from "@/lib/prisma";
import { getEcosystemPreference } from "@/app/actions/resources-actions";
import ResourcesClient from "./ResourcesClient";
import { redirect } from "next/navigation";

export default async function ResourcesRootPage() {
  const pref = await getEcosystemPreference();

  // Instantly auto-forward returning users to their preferred contextual experience
  if (pref?.board) {
    if (pref.qualification) {
      redirect(`/resources/${pref.board}/${pref.qualification}`);
    } else {
      redirect(`/resources/${pref.board}`);
    }
  }

  const boards = await prisma.board.findMany({
    include: {
      qualifications: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { title: "asc" },
  });

  return <ResourcesClient initialPreference={pref} boards={boards} />;
}
