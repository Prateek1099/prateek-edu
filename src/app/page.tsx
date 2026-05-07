import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe2, ShieldCheck, ArrowRight, Layers, SplitSquareHorizontal, FolderTree, Clock, FileText, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getDashboardData(userId?: string) {
  if (!userId) return { recentProgress: [], newPapers: [] };
  
  const recentProgress = await prisma.userProgress.findMany({
    where: { userId, status: 'in_progress' },
    include: {
      paper: {
        include: { subject: { include: { qualification: true } } }
      }
    },
    orderBy: { lastViewed: 'desc' },
    take: 3
  });

  const newPapers = await prisma.paper.findMany({
    orderBy: [
      { year: 'desc' },
      { season: 'desc' }
    ],
    take: 4,
    include: { subject: { include: { qualification: true } } }
  });

  return { recentProgress, newPapers };
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const { recentProgress, newPapers } = await getDashboardData(userId);

  return (
    <div className="flex flex-col w-full bg-background font-sans items-center justify-center min-h-[calc(100vh-64px)] overflow-hidden">
      <section className="w-full h-full flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background relative py-12 lg:py-24">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        
        <div className="container px-4 md:px-8 max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 w-full mb-8">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-8 shadow-sm">
            🎉 Welcome to the new standard in academic resources
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Welcome to <span className="text-primary block sm:inline mt-2 sm:mt-0">ExamNest</span>
          </h1>
          <p className="max-w-2xl text-xl text-muted-foreground mb-12">
            Free, highly organized, and distraction-free past papers and study resources built for serious students.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto mt-4 px-2">
            
            <Link href="/board/cambridge" aria-label="Select Cambridge Board" className="w-full transition-transform hover:-translate-y-1 duration-300">
              <Card className="h-full border-2 border-muted hover:border-primary/40 shadow-sm hover:shadow-xl transition-all overflow-hidden relative group rounded-2xl bg-card">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-8 sm:p-10 flex flex-col items-center justify-center text-center h-full relative z-10">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Globe2 className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">Cambridge International</h2>
                  <p className="text-muted-foreground mb-8 text-lg font-medium leading-relaxed">
                    IGCSE, O Level, AS & A Level resources including ICT and Computer Science.
                  </p>
                  <Button className="w-full gap-2 rounded-xl mt-auto h-12 text-base shadow-md group-hover:bg-primary/90" size="lg">
                    Select Cambridge <ArrowRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/board/cbse" aria-label="Select CBSE Board" className="w-full transition-transform hover:-translate-y-1 duration-300">
              <Card className="h-full border-2 border-muted hover:border-primary/40 shadow-sm hover:shadow-xl transition-all overflow-hidden relative group rounded-2xl bg-card">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardContent className="p-8 sm:p-10 flex flex-col items-center justify-center text-center h-full relative z-10">
                  <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <ShieldCheck className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold mb-4 tracking-tight">CBSE Board</h2>
                  <p className="text-muted-foreground mb-8 text-lg font-medium leading-relaxed">
                    Class 10 and Class 12 resources including Informatics Practices & IT.
                  </p>
                  <Button className="w-full gap-2 rounded-xl mt-auto h-12 text-base shadow-md group-hover:bg-primary/90" size="lg">
                    Select CBSE <ArrowRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Dynamic Logged In Sections */}
      {session && (
        <section className="w-full py-16 bg-muted/10 border-t border-border">
          <div className="container px-4 md:px-8 max-w-7xl mx-auto">
            
            {recentProgress.length > 0 && (
              <div className="mb-16">
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Continue Studying</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {recentProgress.map((progress) => (
                    <Link key={progress.id} href={`/papers/viewer?qp=${encodeURIComponent(progress.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(progress.paper.msPdfUrl || '')}&id=${progress.paper.id}`} className="block">
                      <Card className="hover:border-primary/50 transition-colors shadow-sm bg-card group cursor-pointer h-full">
                        <CardHeader className="pb-2">
                          <CardDescription className="text-xs font-semibold text-primary/80 uppercase tracking-wider">{progress.paper.subject.code || progress.paper.subject.name} • {progress.paper.subject.qualification.name.toUpperCase()}</CardDescription>
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">{progress.paper.year} • {progress.paper.season}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Paper {progress.paper.paperNumber} {progress.paper.variant ? `(Var ${progress.paper.variant})` : ''}</span>
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-xs font-medium"><Clock className="w-3 h-3"/> In Progress</span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {newPapers.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Recently Added Papers</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {newPapers.map((paper) => (
                    <Link key={paper.id} href={`/papers/viewer?qp=${encodeURIComponent(paper.questionPdfUrl || '')}&ms=${encodeURIComponent(paper.msPdfUrl || '')}&id=${paper.id}`} className="block">
                      <Card className="hover:border-primary/50 transition-colors shadow-sm bg-card group cursor-pointer h-full">
                        <CardHeader className="p-4 pb-2">
                          <CardDescription className="text-xs font-semibold">{paper.subject.code || paper.subject.name}</CardDescription>
                          <CardTitle className="text-base group-hover:text-primary transition-colors">{paper.year} {paper.season}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <div className="text-xs text-muted-foreground">
                            Paper {paper.paperNumber} {paper.variant ? `• V${paper.variant}` : ''}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="w-full py-24 bg-card border-t border-border/50">
        <div className="container px-4 md:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Why choose ExamNest?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We stripped away the clutter, the ads, and the confusing layouts to give you exactly what you need.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <Layers className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Ad-free Experience</h3>
                <p className="text-muted-foreground">100% ad-free environment to ensure distraction-free studying and focus.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <SplitSquareHorizontal className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Dual Split Viewer</h3>
                <p className="text-muted-foreground">View the Question Paper and Mark Scheme side-by-side simultaneously natively.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                  <FolderTree className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Series Bundling</h3>
                <p className="text-muted-foreground">Theory, practical components, and source files perfectly bundled by exam series.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
