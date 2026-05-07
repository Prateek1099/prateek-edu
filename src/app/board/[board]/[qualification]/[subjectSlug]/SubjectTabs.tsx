"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SubjectTabs({
  board,
  qualification,
  subjectSlug,
}: {
  board: string;
  qualification: string;
  subjectSlug: string;
}) {
  const pathname = usePathname();
  const basePath = `/board/${board}/${qualification}/${subjectSlug}`;

  const tabs = [
    { name: "Past Papers", path: `${basePath}/papers` },
    { name: "Topical Papers", path: `${basePath}/topical` },
    { name: "Revision Notes", path: `${basePath}/notes` },
  ];

  return (
    <div className="flex items-center gap-6 mt-8 border-b -mb-[1px]">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.path) || (pathname === basePath && tab.name === "Past Papers");
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className={cn(
              "pb-4 text-sm font-medium transition-colors border-b-2",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
