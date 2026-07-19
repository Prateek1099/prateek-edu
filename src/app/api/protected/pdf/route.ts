import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    const download = searchParams.get("download") === "true";
    let isNote = searchParams.get("isNote") === "true";

    if (!url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    // Fallback: If not explicitly flagged as note, check DB to see if it is a Note
    if (!isNote) {
      const noteExists = await prisma.note.findFirst({
        where: {
          pdfUrl: url,
        },
      });
      if (noteExists) {
        isNote = true;
      }
    }

    // Notes remain account-only, but are currently free for every verified student.
    if (isNote) {
      const session = await getServerSession(authOptions);
      if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
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
    targetUrl = targetUrl.replace(/ /g, '%20');

    // Fetch the PDF from the original source
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      console.error(`PDF Proxy failed to fetch: ${targetUrl} (Status: ${response.status})`);
      return new NextResponse("Failed to fetch PDF", { status: response.status });
    }

    const filename = url.split("/").pop() || "document.pdf";

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
