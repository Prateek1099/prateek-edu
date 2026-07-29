import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const download = searchParams.get("download") === "true";
    const requestedAsNote = searchParams.get("isNote") === "true";

    if (!url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    const urlWithEncodedSpaces = url.replace(/ /g, "%20");
    const note = await prisma.note.findFirst({
      where: {
        pdfUrl: {
          in: Array.from(new Set([url, urlWithEncodedSpaces])),
        },
      },
      select: { isPublished: true },
    });

    // Never trust a public query flag to turn an arbitrary URL into a note.
    if (requestedAsNote && !note) {
      return new NextResponse("Note not found", { status: 404 });
    }

    // Published Notes are free for everyone. Draft Notes remain admin-only so the
    // existing admin preview continues to work without exposing unpublished files.
    if (note && !note.isPublished) {
      const session = await getServerSession(authOptions);
      const user = session?.user as
        | { email?: string | null; role?: string }
        | undefined;
      if (!user?.email || !isAdminRole(user.role)) {
        return new NextResponse("Note not found", { status: 404 });
      }
    }

    let targetUrl = url;
    // If the URL is relative (e.g., stored locally in public folder)
    if (targetUrl.startsWith("/")) {
      let host = req.headers.get("host") || "localhost:3000";
      // Fix Node.js fetch localhost IPv6 resolution issue in dev
      if (host.startsWith("localhost")) {
        host = host.replace("localhost", "127.0.0.1");
      }
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      targetUrl = `${protocol}://${host}${targetUrl}`;
    }

    // Fix spaces in the URL without double-encoding existing %XX sequences.
    // searchParams.get() auto-decodes, so we just need to re-encode spaces.
    targetUrl = targetUrl.replace(/ /g, "%20");

    // Fetch the PDF from the original source
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      console.error(`PDF Proxy failed to fetch: ${targetUrl} (Status: ${response.status})`);
      return new NextResponse("Failed to fetch PDF", { status: response.status });
    }

    const storedFilename = url.split("/").pop() || "document.pdf";
    let filename = storedFilename;
    try {
      filename = decodeURIComponent(storedFilename);
    } catch {
      // Keep the stored filename when it contains malformed percent encoding.
    }
    filename = filename.replace(/["\r\n]/g, "_");

    let contentType = response.headers.get("content-type") || "application/pdf";
    // Force correct content type for PDFs — some old Blob uploads may have wrong content-type
    if (url.toLowerCase().endsWith('.pdf') || filename.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    }
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": download 
          ? `attachment; filename="${filename}"`
          : "inline", 
      },
    });
  } catch (error) {
    console.error("PDF Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
