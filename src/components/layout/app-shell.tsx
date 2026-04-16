import * as React from "react";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export interface AppShellProps {
  children: React.ReactNode;
}

function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-8 pb-24">{children}</main>
      <Footer />
    </div>
  );
}

export { AppShell };
