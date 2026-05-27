import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return new NextResponse("Missing URL", { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const isPremium = (session.user as any).isPremium;
    
    // In the future, we could check if this specific paper is premium-only.
    // For now, if you are hitting the secure proxy, we enforce a session.
    // If we want to strictly lock ALL proxy requests to premium users:
    /*
    if (!isPremium) {
      return new NextResponse("Premium Required", { status: 403 });
    }
    */

    // Fetch the PDF from the original source (e.g. Vercel Blob)
    const response = await fetch(url);
    
    if (!response.ok) {
      return new NextResponse("Failed to fetch PDF", { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "application/pdf";
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        // Do not allow direct download easily
        "Content-Disposition": "inline", 
      },
    });
  } catch (error) {
    console.error("PDF Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
