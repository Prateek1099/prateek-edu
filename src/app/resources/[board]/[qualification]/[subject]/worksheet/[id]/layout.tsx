import type { Metadata } from "next";
import { PRIVATE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = { title: "Worksheet Viewer", robots: PRIVATE_ROBOTS };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
