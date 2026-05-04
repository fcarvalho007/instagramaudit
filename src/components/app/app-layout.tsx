import type { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";

interface AppLayoutProps {
  children: ReactNode;
  userEmail?: string;
  userName?: string;
}

export function AppLayout({ children, userEmail, userName }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-surface-muted">
      <AppSidebar userEmail={userEmail} userName={userName} />

      <div className="flex flex-1 flex-col overflow-x-hidden">
        <AppTopbar userEmail={userEmail} />

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1180px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
