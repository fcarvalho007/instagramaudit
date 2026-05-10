import * as React from "react";
import { useRouterState } from "@tanstack/react-router";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export interface AppShellProps {
  children: React.ReactNode;
}

const PUBLIC_CHROME_DISABLED_PREFIXES = ["/admin"];

function AppShell({ children }: AppShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = PUBLIC_CHROME_DISABLED_PREFIXES.some((p) =>
    pathname === p || pathname.startsWith(`${p}/`),
  );

  if (hideChrome) {
    // Admin (e outras áreas internas) controlam o seu próprio layout completo.
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-8 pb-24">{children}</main>
      <Footer />
    </div>
  );
}

export { AppShell };
