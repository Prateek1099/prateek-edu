"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CheckoutButtonProps {
  courseId: string;
  price: number;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error: { description: string };
}

interface RazorpayInstance {
  on(event: "payment.failed", handler: (response: RazorpayFailureResponse) => void): void;
  open(): void;
}

interface RazorpayOptions {
  key: string | undefined;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => Promise<void>;
  prefill: { name: string; email: string };
  theme: { color: string };
}

interface RazorpayOrderResponse {
  id?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

import Script from "next/script";

export default function CheckoutButton({ courseId, price }: CheckoutButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (!window.Razorpay) {
      alert("Razorpay SDK failed to load. Please check your connection.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create order on backend
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      let data: RazorpayOrderResponse;
      try {
        data = await res.json() as RazorpayOrderResponse;
      } catch {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order");
      }
      if (!data.id || typeof data.amount !== "number") {
        throw new Error("Server returned an invalid payment order.");
      }

      // 2. Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
        amount: data.amount,
        currency: data.currency || "INR",
        name: "Vexa",
        description: "Course Enrollment",
        order_id: data.id,
        handler: async function (response: RazorpayPaymentResponse) {
          // 3. Verify payment on backend
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
            router.push("/dashboard?success=true");
            router.refresh();
          } else {
            alert("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          name: session.user?.name || "",
          email: session.user?.email || "",
        },
        theme: {
          color: "#0f172a", // Match your app primary color
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      
      paymentObject.on("payment.failed", function (response: RazorpayFailureResponse) {
        alert("Payment Failed: " + response.error.description);
      });
      
    } catch (error: unknown) {
      console.error("Checkout error:", error);
      alert(error instanceof Error ? error.message : "Unable to start checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <Button onClick={handleCheckout} disabled={loading} className="w-full font-semibold">
        {loading ? "Processing..." : `Buy Now - ₹${price}`}
      </Button>
    </>
  );
}
