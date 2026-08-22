import type { Metadata } from "next";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = publicMetadata({
  title: "Contact Vexa",
  description: "Contact Vexa for support, learning resource questions, school assessment workflows, or managed teacher access.",
  path: "/contact",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
