"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { DeviceEnforcer } from "./DeviceEnforcer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <DeviceEnforcer>{children}</DeviceEnforcer>
      </SessionProvider>
    </ThemeProvider>
  );
}
