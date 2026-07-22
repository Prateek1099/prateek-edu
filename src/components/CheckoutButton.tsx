"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CheckoutButtonProps {
  courseId: string;
  price: number;
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

    if (!(window as any).Razorpay) {
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

      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Server returned an invalid response. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create order");
      }

      // 2. Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
        amount: data.amount,
        currency: "INR",
        name: "Vexa",
        description: "Course Enrollment",
        order_id: data.id,
        handler: async function (response: any) {
          // 3. Verify payment on backend
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              courseId,
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
          name: session.user?.name,
          email: session.user?.email,
        },
        theme: {
          color: "#0f172a", // Match your app primary color
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
      
      paymentObject.on("payment.failed", function (response: any) {
        alert("Payment Failed: " + response.error.description);
      });
      
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message);
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
