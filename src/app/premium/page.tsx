import { prisma } from "@/lib/prisma";
import PricingClient from "./PricingClient";

export const dynamic = "force-dynamic";

export default async function PremiumPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" }
  });

  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          Upgrade to Vexa Premium
        </h1>
        <p className="text-lg text-muted-foreground">
          Unlock unlimited AI evaluations, access all past papers, and enjoy a distraction-free, secure study environment.
        </p>
      </div>

      {plans.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground">
          No active subscription plans found. Please contact support.
        </div>
      ) : (
        <PricingClient plans={plans} />
      )}
    </div>
  );
}
