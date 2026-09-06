"use client";

import { usePathname } from "next/navigation";

const AUTHENTICATED_SHELL_PREFIXES = ["/admin", "/workspace", "/dashboard"] as const;

export function usesAuthenticatedShell(pathname: string) {
  return AUTHENTICATED_SHELL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AppChrome({
  children,
  publicHeader,
  publicFooter,
}: {
  children: React.ReactNode;
  publicHeader: React.ReactNode;
  publicFooter: React.ReactNode;
}) {
  const pathname = usePathname() || "/";

  if (usesAuthenticatedShell(pathname)) {
    return <div className="flex flex-1 flex-col">{children}</div>;
  }

  return (
    <>
      {publicHeader}
      <main className="flex flex-1 flex-col">{children}</main>
      {publicFooter}
    </>
  );
}
