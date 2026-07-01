import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Globe2, ShieldCheck, ArrowRight, Layers, SplitSquareHorizontal, FolderTree, Clock, FileText, Sparkles, GraduationCap, Target, LineChart } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEcosystemPreference } from "@/app/actions/resources-actions";

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

  return { recentProgress };
}

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const prefRaw = await getEcosystemPreference();
  let ecosystemPref: { board: string, qualification: string, boardTitle: string, qualTitle: string } | null = null;
  if (prefRaw) {
    let boardTitle = prefRaw.board === 'cambridge' ? 'Cambridge International' : prefRaw.board === 'cbse' ? 'CBSE' : prefRaw.board;
    let qualTitle = prefRaw.qualification === 'igcse' ? 'IGCSE' : prefRaw.qualification === 'as-a-level' ? 'AS & A Level' : prefRaw.qualification === 'o-level' ? 'O Level' : prefRaw.qualification?.toUpperCase() || "";
    ecosystemPref = { ...prefRaw, boardTitle, qualTitle };
  }
  const { recentProgress } = await getDashboardData(userId);

  return (
    <div className="flex flex-col w-full bg-background font-sans items-center justify-center overflow-hidden">
      <section className="w-full flex flex-col items-center justify-center bg-gradient-to-b from-primary/5 to-background relative pt-12 pb-8">
        {/* Subtle decorative background shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-30 pointer-events-none"></div>
        
        <div className="container px-4 md:px-8 max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 w-full mb-8">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-8 shadow-sm">
            🎉 Welcome to the new standard in academic resources
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Welcome to <span className="text-primary block sm:inline mt-2 sm:mt-0">Vexa</span>
          </h1>
          <p className="max-w-2xl text-xl text-muted-foreground mb-12">
            Free, highly organized, and distraction-free past papers and study resources built for serious students.
          </p>
          
          {!ecosystemPref ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mx-auto mt-4 px-2">
              <form action={async () => {
                "use server";
                const { setEcosystemPreference } = await import("@/app/actions/resources-actions");
                const { redirect } = await import("next/navigation");
                await setEcosystemPreference("cambridge", "");
                redirect("/resources");
              }} className="w-full">
                <button type="submit" aria-label="Select Cambridge Board" className="w-full text-left transition-transform hover:-translate-y-1 duration-300 outline-none">
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
                      <div className="w-full gap-2 rounded-xl mt-auto h-12 text-base shadow-md group-hover:bg-primary/90 bg-primary text-primary-foreground flex items-center justify-center px-8 py-2 font-medium transition-colors">
                        Select Cambridge <ArrowRight className="h-5 w-5 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </form>

              <form action={async () => {
                "use server";
                const { setEcosystemPreference } = await import("@/app/actions/resources-actions");
                const { redirect } = await import("next/navigation");
                await setEcosystemPreference("cbse", "");
                redirect("/resources");
              }} className="w-full">
                <button type="submit" aria-label="Select CBSE Board" className="w-full text-left transition-transform hover:-translate-y-1 duration-300 outline-none">
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
                      <div className="w-full gap-2 rounded-xl mt-auto h-12 text-base shadow-md group-hover:bg-primary/90 bg-primary text-primary-foreground flex items-center justify-center px-8 py-2 font-medium transition-colors">
                        Select CBSE <ArrowRight className="h-5 w-5 ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-6 mt-8 mb-8 w-full max-w-4xl mx-auto">
              <div className="bg-card border-2 border-primary/20 rounded-2xl p-12 w-full shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                     <GraduationCap className="w-8 h-8 text-primary" />
                   </div>
                   <h2 className="text-3xl font-bold mb-2">Welcome Back.</h2>
                   <p className="text-muted-foreground text-lg mb-8">Currently Studying: <span className="font-semibold text-foreground block mt-1">{ecosystemPref.boardTitle} {ecosystemPref.qualTitle ? `• ${ecosystemPref.qualTitle}` : ''}</span></p>
                   
                   <div className="flex flex-col sm:flex-row w-full gap-4 justify-center">
                     <Link href={ecosystemPref.qualification ? `/resources/${ecosystemPref.board}/${ecosystemPref.qualification}` : `/resources/${ecosystemPref.board}`} className="w-full sm:w-auto">
                       <Button size="lg" className="w-full sm:w-auto font-semibold shadow-md transition-transform hover:scale-105">Continue Learning <ArrowRight className="ml-2 w-4 h-4" /></Button>
                     </Link>
                     <Link href={`/resources/${ecosystemPref.board}`} className="w-full sm:w-auto">
                       <Button size="lg" variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105">Open Resources</Button>
                     </Link>
                   </div>
                   
                   <form action={async () => {
                     "use server";
                     const { clearEcosystemPreference } = await import("@/app/actions/resources-actions");
                     const { redirect } = await import("next/navigation");
                     await clearEcosystemPreference();
                     redirect("/");
                   }} className="mt-8 w-full">
                     <button type="submit" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Switch Ecosystem</button>
                   </form>
                </div>
              </div>
            </div>
          )}


        </div>
      </section>

      {/* How Vexa Works Section */}
      <section className="w-full py-20 bg-background relative z-20">
        <div className="container px-4 md:px-8 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How Vexa Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Your streamlined path to better grades.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-border/80" />
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-card border-2 border-muted shadow-sm flex items-center justify-center mb-6 font-bold text-xl text-primary">1</div>
              <h3 className="text-xl font-bold mb-2">Select Ecosystem</h3>
              <p className="text-muted-foreground">Choose your academic board, like Cambridge or CBSE.</p>
            </div>
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-card border-2 border-muted shadow-sm flex items-center justify-center mb-6 font-bold text-xl text-primary">2</div>
              <h3 className="text-xl font-bold mb-2">Choose Subjects</h3>
              <p className="text-muted-foreground">Access perfectly organized notes, practice challenges, and past papers.</p>
            </div>
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-card border-2 border-muted shadow-sm flex items-center justify-center mb-6 font-bold text-xl text-primary">3</div>
              <h3 className="text-xl font-bold mb-2">Study Smarter</h3>
              <p className="text-muted-foreground">Track completed papers and manage your revision effectively.</p>
            </div>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section className="w-full py-24 bg-card border-t border-border/50">
        <div className="container px-4 md:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Why choose Vexa?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We stripped away the clutter, the ads, and the confusing layouts to give you exactly what you need.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Focused Revision</h3>
                <p className="text-muted-foreground leading-relaxed">Clean, distraction-free study environment built for serious students.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <FolderTree className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Organized Resources</h3>
                <p className="text-muted-foreground leading-relaxed">Past papers, notes, and topic resources structured by board, qualification, and subject.</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-muted hover:border-primary/50 transition-colors shadow-sm">
              <CardContent className="p-8">
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                  <LineChart className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">Track Your Progress</h3>
                <p className="text-muted-foreground leading-relaxed">Track completed papers, continue studying, and manage revision more effectively.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
