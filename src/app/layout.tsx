import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/react";
import { AppChrome } from "@/components/AppChrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vexa | Cambridge & CBSE Hub",
  description: "Vexa is an intelligent learning platform designed for students and teachers featuring Question Banks, Quick Practice, Worksheets, Revision Planning, Teaching Intelligence, AI Insights and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <Providers>
          <TooltipProvider>
            <AppChrome publicHeader={<Navbar />} publicFooter={<Footer />}>
              {children}
            </AppChrome>
            <Toaster />
          </TooltipProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
