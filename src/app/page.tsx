import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe2, ShieldCheck, ArrowRight, FolderTree, GraduationCap, Target, LineChart, Sparkles } from "lucide-react";
import { getEcosystemPreference } from "@/app/actions/resources-actions";

export default async function Home() {
  const prefRaw = await getEcosystemPreference();
  let ecosystemPref: { board: string, qualification: string, boardTitle: string, qualTitle: string } | null = null;
  if (prefRaw) {
    const boardTitle = prefRaw.board === 'cambridge' ? 'Cambridge International' : prefRaw.board === 'cbse' ? 'CBSE' : prefRaw.board;
    const qualTitle = prefRaw.qualification === 'igcse' ? 'IGCSE' : prefRaw.qualification === 'as-a-level' ? 'AS & A Level' : prefRaw.qualification === 'o-level' ? 'O Level' : prefRaw.qualification?.toUpperCase() || "";
    ecosystemPref = { ...prefRaw, boardTitle, qualTitle };
  }
  return (
    <div className="flex flex-col w-full bg-background font-sans items-center justify-center overflow-hidden">
      <section className="w-full flex flex-col items-center justify-center relative pt-14 pb-12">
        {/* Subtle decorative background shapes */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-16 -z-10 mx-auto h-96 max-w-6xl overflow-hidden blur-3xl opacity-25 bg-gradient-to-b from-indigo-500/20 via-purple-600/10 to-transparent"
        />

        <div className="container px-4 md:px-8 max-w-5xl mx-auto flex flex-col items-center text-center relative z-10 w-full mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs sm:text-sm font-medium text-primary mb-8 shadow-sm">
            <Sparkles className="size-3.5" />
            <span>Structured Revision for Cambridge & CBSE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight max-w-3xl">
            Master your exams with <span className="text-primary">Vexa</span>
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed">
            Free, structured, and distraction-free revision resources designed specifically for serious students.
          </p>

          {!ecosystemPref ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl mx-auto mt-2 px-2">
              <form action={async () => {
                "use server";
                const { setEcosystemPreference } = await import("@/app/actions/resources-actions");
                const { redirect } = await import("next/navigation");
                await setEcosystemPreference("cambridge", "");
                redirect("/resources");
              }} className="w-full">
                <button type="submit" aria-label="Select Cambridge Board" className="w-full text-left transition-transform hover:-translate-y-1 duration-300 outline-none">
                  <Card className="h-full border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all overflow-hidden relative group rounded-2xl bg-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <CardContent className="p-7 sm:p-9 flex flex-col items-center justify-center text-center h-full relative z-10">
                      <div className="size-16 sm:size-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                        <Globe2 className="size-8 sm:size-10 text-primary" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Cambridge International</h2>
                      <p className="text-muted-foreground mb-8 text-sm sm:text-base font-normal leading-relaxed">
                        IGCSE, O Level, AS & A Level resources including ICT and Computer Science.
                      </p>
                      <div className="w-full gap-2 rounded-xl mt-auto h-11 text-sm sm:text-base shadow-md group-hover:bg-primary/90 bg-primary text-primary-foreground flex items-center justify-center px-6 py-2 font-medium transition-colors">
                        Select Cambridge <ArrowRight className="size-4 ml-1.5" />
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
                  <Card className="h-full border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-xl transition-all overflow-hidden relative group rounded-2xl bg-card">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <CardContent className="p-7 sm:p-9 flex flex-col items-center justify-center text-center h-full relative z-10">
                      <div className="size-16 sm:size-20 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                        <ShieldCheck className="size-8 sm:size-10 text-primary" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">CBSE Board</h2>
                      <p className="text-muted-foreground mb-8 text-sm sm:text-base font-normal leading-relaxed">
                        Class 9, Class 10, Class 11, and Class 12 resources including Information Technology.
                      </p>
                      <div className="w-full gap-2 rounded-xl mt-auto h-11 text-sm sm:text-base shadow-md group-hover:bg-primary/90 bg-primary text-primary-foreground flex items-center justify-center px-6 py-2 font-medium transition-colors">
                        Select CBSE <ArrowRight className="size-4 ml-1.5" />
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-6 mt-4 mb-8 w-full max-w-3xl mx-auto">
              <div className="bg-card border border-primary/20 rounded-2xl p-8 sm:p-10 w-full shadow-lg relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center text-center">
                   <div className="bg-primary/10 border border-primary/20 size-14 rounded-2xl flex items-center justify-center mb-4">
                     <GraduationCap className="size-7 text-primary" />
                   </div>
                   <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome Back</h2>
                   <p className="text-muted-foreground text-sm sm:text-base mb-6">Currently Studying: <span className="font-semibold text-foreground">{ecosystemPref.boardTitle} {ecosystemPref.qualTitle ? `• ${ecosystemPref.qualTitle}` : ''}</span></p>

                   <div className="flex flex-col sm:flex-row w-full gap-3 justify-center">
                     <Link href={ecosystemPref.qualification ? `/resources/${ecosystemPref.board}/${ecosystemPref.qualification}` : `/resources/${ecosystemPref.board}`} className="w-full sm:w-auto">
                       <Button size="lg" className="w-full sm:w-auto font-semibold shadow-md gap-2">Continue Learning <ArrowRight className="size-4" /></Button>
                     </Link>
                     <Link href={`/resources/${ecosystemPref.board}`} className="w-full sm:w-auto">
                       <Button size="lg" variant="outline" className="w-full sm:w-auto">Open Resources</Button>
                     </Link>
                   </div>

                   <form action={async () => {
                     "use server";
                     const { clearEcosystemPreference } = await import("@/app/actions/resources-actions");
                     const { redirect } = await import("next/navigation");
                     await clearEcosystemPreference();
                     redirect("/");
                   }} className="mt-6 w-full">
                     <button type="submit" className="text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 cursor-pointer">Switch Ecosystem</button>
                   </form>
                </div>
              </div>
            </div>
          )}


        </div>
      </section>

      {/* How Vexa Works Section */}
      <section className="w-full py-16 sm:py-20 bg-background relative z-20">
        <div className="container px-4 md:px-8 max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">How Vexa Works</h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Your streamlined path to exam clarity and better scores.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px bg-border/80" />

            <div className="flex flex-col items-center text-center relative z-10">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 shadow-sm flex items-center justify-center mb-5 font-bold text-base text-primary">1</div>
              <h3 className="text-lg font-bold mb-2">Select Ecosystem</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Choose your academic board, such as Cambridge International or CBSE.</p>
            </div>
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 shadow-sm flex items-center justify-center mb-5 font-bold text-base text-primary">2</div>
              <h3 className="text-lg font-bold mb-2">Choose Subjects</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Access organized notes, topical questions, worksheets, and practice challenges.</p>
            </div>
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 shadow-sm flex items-center justify-center mb-5 font-bold text-base text-primary">3</div>
              <h3 className="text-lg font-bold mb-2">Study Smarter</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Track your practice, eliminate weak topics with your Mistake Book, and master concepts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-16 sm:py-20 bg-muted/25 border-t border-border/50">
        <div className="container px-4 md:px-8 max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-3">Why choose Vexa?</h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              We stripped away the clutter and ads to give you clean, high-yield study material.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="bg-card border-border/80 hover:border-primary/40 transition-all shadow-sm rounded-2xl">
              <CardContent className="p-6 sm:p-7">
                <div className="bg-primary/10 border border-primary/20 size-12 rounded-xl flex items-center justify-center mb-5">
                  <Target className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Focused Revision</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Clean, distraction-free study environment tailored for deep conceptual understanding.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 hover:border-primary/40 transition-all shadow-sm rounded-2xl">
              <CardContent className="p-6 sm:p-7">
                <div className="bg-primary/10 border border-primary/20 size-12 rounded-xl flex items-center justify-center mb-5">
                  <FolderTree className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Organized Resources</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Notes, topical questions, worksheets, and practice resources structured clearly by board and subject.</p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/80 hover:border-primary/40 transition-all shadow-sm rounded-2xl">
              <CardContent className="p-6 sm:p-7">
                <div className="bg-primary/10 border border-primary/20 size-12 rounded-xl flex items-center justify-center mb-5">
                  <LineChart className="size-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">Track Your Progress</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Monitor accuracy scores, revisit repeated mistakes, and revise weak topics systematically.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
