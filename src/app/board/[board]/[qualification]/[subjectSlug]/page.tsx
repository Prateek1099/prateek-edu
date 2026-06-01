import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, LayoutGrid, BookOpen, ChevronRight } from "lucide-react";

export default async function SubjectRootPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subjectSlug: string }>;
}) {
  const { board, qualification, subjectSlug } = await params;
  const basePath = `/board/${board}/${qualification}/${subjectSlug}`;

  const modules = [
    {
      title: "Revision Notes",
      description: "Chapter-wise notes to strengthen your concepts.",
      icon: BookOpen,
      href: `${basePath}/notes`,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Topical Questions",
      description: "Practice questions sorted by topic.",
      icon: LayoutGrid,
      href: `${basePath}/topical`,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Past Papers",
      description: "Full past papers with mark schemes and variants.",
      icon: FileText,
      href: `${basePath}/papers`,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="py-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Academic Dashboard</h2>
        <p className="text-muted-foreground">Choose a module to start learning and practicing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.title} href={mod.href}>
              <Card className="hover:border-primary/50 transition-all hover:shadow-md h-full group bg-card">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className={`${mod.bg} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${mod.color}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
                  <p className="text-muted-foreground flex-1 mb-4">{mod.description}</p>
                  <div className="flex items-center text-sm font-medium text-primary mt-auto">
                    Open Module <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
