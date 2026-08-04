import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, isSuperAdmin } from "@/lib/roles";
import { isPrivateOrLocalHostname, isTrustedDocumentHost } from "@/lib/document-security";

const MAX_PDF_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

async function readPdfWithLimit(response: Response): Promise<Uint8Array | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > MAX_PDF_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  return sample.includes("%PDF-");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUrl = searchParams.get("url");
    const topicalId = searchParams.get("topicalId");
    const topicalDocument = searchParams.get("document") || "questions";
    const download = searchParams.get("download") === "true";
    const requestedAsNote = searchParams.get("isNote") === "true";

    if (topicalId && topicalDocument !== "questions" && topicalDocument !== "solutions") {
      return new NextResponse("Invalid topical document type", { status: 400 });
    }

    let url = requestedUrl;
    if (topicalId) {
      const topical = await prisma.topicalQuestion.findUnique({
        where: { id: topicalId },
        select: { questionsPdfUrl: true, answersPdfUrl: true, isPublished: true },
      });
      if (!topical) return new NextResponse("Topical resource not found", { status: 404 });

      if (!topical.isPublished) {
        const session = await getServerSession(authOptions);
        const user = session?.user as { role?: string } | undefined;
        if (!isSuperAdmin(user?.role)) {
          return new NextResponse("Topical resource not found", { status: 404 });
        }
      }

      url = topicalDocument === "solutions" ? topical.answersPdfUrl : topical.questionsPdfUrl;
      if (!url) return new NextResponse("Topical document not found", { status: 404 });
    }

    if (!url) return new NextResponse("Missing URL", { status: 400 });

    const urlWithEncodedSpaces = url.replace(/ /g, "%20");
    const note = topicalId
      ? null
      : await prisma.note.findFirst({
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

    let targetUrl: URL;
    if (url.startsWith("/") && !url.startsWith("//")) {
      if (!url.toLowerCase().split(/[?#]/)[0].endsWith(".pdf") || url.includes("..")) {
        return new NextResponse("Invalid document path", { status: 400 });
      }

      let host = req.headers.get("host") || "localhost:3000";
      if (host.startsWith("localhost")) {
        host = host.replace("localhost", "127.0.0.1");
      }
      const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
      targetUrl = new URL(`${protocol}://${host}${url.replace(/ /g, "%20")}`);
    } else {
      try {
        targetUrl = new URL(url.replace(/ /g, "%20"));
      } catch {
        return new NextResponse("Invalid document URL", { status: 400 });
      }

      if (
        targetUrl.protocol !== "https:" ||
        targetUrl.username ||
        targetUrl.password ||
        isPrivateOrLocalHostname(targetUrl.hostname) ||
        (!note && !isTrustedDocumentHost(targetUrl.hostname))
      ) {
        return new NextResponse("Document source is not allowed", { status: 403 });
      }
    }

    const response = await fetch(targetUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    
    if (!response.ok) {
      console.error(`PDF Proxy failed to fetch: ${targetUrl} (Status: ${response.status})`);
      return new NextResponse("Failed to fetch PDF", { status: response.status });
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_PDF_BYTES) {
      return new NextResponse("PDF is too large", { status: 413 });
    }

    const sourceContentType = response.headers.get("content-type")?.toLowerCase();
    if (
      sourceContentType &&
      !sourceContentType.includes("application/pdf") &&
      !sourceContentType.includes("application/octet-stream")
    ) {
      return new NextResponse("Document source did not return a PDF", { status: 415 });
    }

    const storedFilename = targetUrl.pathname.split("/").pop() || "document.pdf";
    let filename = storedFilename;
    try {
      filename = decodeURIComponent(storedFilename);
    } catch {
      // Keep the stored filename when it contains malformed percent encoding.
    }
    filename = filename.replace(/["\r\n]/g, "_");

    const pdfBody = await readPdfWithLimit(response);
    if (!pdfBody) {
      return new NextResponse("PDF is too large or empty", { status: 413 });
    }
    if (!hasPdfSignature(pdfBody)) {
      return new NextResponse("Document source did not return a valid PDF", { status: 415 });
    }

    const responseBody = new ArrayBuffer(pdfBody.byteLength);
    new Uint8Array(responseBody).set(pdfBody);

    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
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
