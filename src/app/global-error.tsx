"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";

/**
 * global-error.tsx catches errors that happen in the ROOT LAYOUT itself
 * (e.g., Navbar server component crashing due to a corrupted session cookie).
 * Regular error.tsx CANNOT catch these because the layout wraps error.tsx.
 *
 * This component must provide its own <html> and <body> tags because
 * the root layout has already failed to render.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("GlobalError boundary caught:", error);
  }, [error]);

  const handleClearSession = async () => {
    // Sign out via NextAuth — this clears the session cookie
    // and redirects to /login for a fresh start.
    await signOut({ callbackUrl: "/login" });
  };

  const handleHardClear = () => {
    // Nuclear option: manually delete all cookies for this site,
    // clear caches, and force reload.
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    window.location.href = "/login";
  };

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          color: "#fafafa",
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            padding: 32,
            textAlign: "center",
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(239, 68, 68, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              fontSize: 32,
            }}
          >
            ⚠️
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#a1a1aa",
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            Your session may have expired or become corrupted. This can happen
            after updates. Click the button below to fix it instantly.
          </p>

          {error.digest && (
            <div
              style={{
                background: "#18181b",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 11,
                color: "#71717a",
                fontFamily: "monospace",
                marginBottom: 24,
                wordBreak: "break-all",
              }}
            >
              Error ID: {error.digest}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={handleClearSession}
              style={{
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 600,
                color: "#fff",
                background: "#6366f1",
                border: "none",
                borderRadius: 10,
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseOver={(e) =>
                ((e.target as HTMLButtonElement).style.background = "#4f46e5")
              }
              onMouseOut={(e) =>
                ((e.target as HTMLButtonElement).style.background = "#6366f1")
              }
            >
              🔑 Clear Session & Log In
            </button>

            <button
              onClick={() => reset()}
              style={{
                padding: "10px 24px",
                fontSize: 14,
                fontWeight: 500,
                color: "#a1a1aa",
                background: "transparent",
                border: "1px solid #27272a",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              🔄 Try Again
            </button>

            <button
              onClick={handleHardClear}
              style={{
                padding: "8px 24px",
                fontSize: 12,
                fontWeight: 400,
                color: "#71717a",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Still not working? Force clear all cookies
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
