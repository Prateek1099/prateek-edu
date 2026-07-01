"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Script from "next/script";

interface Plan {
  id: string;
  name: string;
  price: number;
  aiQuota: number;
  isActive: boolean;
}

export default function PricingClient({ plans }: { plans: Plan[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (plan: Plan) => {
    if (!session) {
      router.push("/login?callbackUrl=/premium");
      return;
    }

    setLoadingPlan(plan.id);
    try {
      // Create Razorpay Order
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const order = await res.json();
      if (order.error) {
        alert("Error creating order: " + order.error);
        setLoadingPlan(null);
        return;
      }

      // Initialize Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Vexa Premium",
        description: `${plan.name} Subscription`,
        order_id: order.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            
            if (verifyRes.ok) {
              alert("Payment successful! Your premium features are now unlocked.");
              // Force a hard refresh so NextAuth refetches the session from DB
              window.location.href = "/dashboard";
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (e) {
            console.error("Verification error:", e);
            alert("Payment verified but failed to update status locally.");
          }
        },
        prefill: {
          name: session.user?.name || "",
          email: session.user?.email || "",
        },
        theme: {
          color: "#4f46e5", // Indigo 600
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment Failed: " + response.error.description);
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      alert("Failed to initiate payment. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative flex flex-col ${plan.name.toLowerCase().includes("year") ? "border-indigo-500 shadow-lg scale-105 z-10" : "border-border"}`}>
            {plan.name.toLowerCase().includes("year") && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                Most Popular
              </div>
            )}
            <CardHeader className="text-center pb-8 pt-8">
              <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-extrabold">₹{plan.price}</span>
                <span className="text-muted-foreground text-sm font-medium">
                  /{plan.name.toLowerCase().includes("year") ? "year" : "month"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-500" />
                  <span>Access to all Past Papers</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-500" />
                  <span>Unlimited Note Downloads</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-500" />
                  <span><strong>{plan.aiQuota}</strong> AI Evaluations / month</span>
                </li>
                <li className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-emerald-500" />
                  <span>Ad-free distraction mode</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full font-semibold text-md h-12" 
                variant={plan.name.toLowerCase().includes("year") ? "default" : "outline"}
                onClick={() => handleSubscribe(plan)}
                disabled={loadingPlan === plan.id}
              >
                {loadingPlan === plan.id ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing</>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
