import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Not logged in → redirect to login
  if (!token) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }

  const role = token.role as string;

  // /admin/* → requires SUPER_ADMIN
  if (pathname.startsWith("/admin")) {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // /workspace/* → requires TEACHER with ACTIVE workspace
  if (pathname.startsWith("/workspace")) {
    if (role !== "TEACHER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    const wsStatus = token.workspaceStatus as string | null;
    if (wsStatus !== "ACTIVE") {
      // Allow access to the workspace root (shows pending page)
      if (pathname !== "/workspace") {
        return NextResponse.redirect(new URL("/workspace", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/workspace/:path*",
  ],
};
