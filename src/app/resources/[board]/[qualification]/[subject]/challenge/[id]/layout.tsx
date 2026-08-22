import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Practice Challenge", robots: PRIVATE_ROBOTS };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
