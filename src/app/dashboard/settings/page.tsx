import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings | Vexa",
  description: "Manage your Vexa profile, preferences, and account settings.",
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  // Fetch the full user record
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      // Include any relations if needed, but the base user has most of what we need
    }
  });

  if (!user) {
    redirect("/login");
  }

  // Fetch linked accounts to see auth provider
  const accounts = await prisma.account.findMany({
    where: { userId }
  });

  // Determine provider. If accounts exist, it's OAuth (e.g., Google). Else, if password exists, it's Credentials.
  let authProvider = "Credentials";
  if (accounts.length > 0) {
    authProvider = accounts[0].provider; // e.g., 'google'
    // capitalize
    authProvider = authProvider.charAt(0).toUpperCase() + authProvider.slice(1);
  }

  // Construct structured data for the client
  const userData = {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    image: user.image || "",
    preferredBoard: user.preferredBoard || "",
    preferredQualification: user.preferredQualification || "",
    emailVerified: user.emailVerified !== null,
    createdAt: user.createdAt.toISOString(),
    isPremium: user.isPremium || false,
    planId: user.planId || null,
    authProvider,
  };

  return (
    <div className="relative flex-1 w-full flex flex-col p-4 md:p-8 overflow-y-auto min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5">Settings</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Manage your profile, academic preferences, appearance, and account security.
          </p>
        </div>

        <SettingsClient user={userData} />
      </div>
    </div>
  );
}
