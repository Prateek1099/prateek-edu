import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/Providers";
import { Analytics } from "@vercel/analytics/react";
import { SITE_URL } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Vexa",
  title: {
    default: "Vexa | Question Paper Builder and Learning Resources",
    template: "%s | Vexa",
  },
  description: "Vexa helps schools prepare structured question banks, blueprint-based test papers, answer keys, and editable DOCX exports, alongside focused student learning resources.",
  openGraph: {
    type: "website",
    siteName: "Vexa",
    title: "Vexa | Question Paper Builder and Learning Resources",
    description: "Blueprint-based test paper generation, structured question banks, editable answer keys, and focused student learning resources.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Vexa question paper builder and learning resources" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vexa | Question Paper Builder and Learning Resources",
    description: "Blueprint-based test paper generation, structured question banks, editable answer keys, and focused student learning resources.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vexa",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: "An independent educational platform for school assessment preparation and student learning resources.",
    email: "support.vexaonline@gmail.com",
  };
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Vexa",
    url: SITE_URL,
    description: "Question paper generation, structured question banks, and focused school learning resources.",
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
        <Providers>
          <TooltipProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">
              {children}
            </main>
            <Footer />
            <Toaster />
          </TooltipProvider>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
