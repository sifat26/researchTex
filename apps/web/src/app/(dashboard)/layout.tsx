import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar className="hidden md:flex" />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header Placeholder */}
        <header className="flex h-14 items-center border-b border-border bg-background px-4 md:hidden">
          <span className="font-semibold tracking-tight">ResearchTex</span>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
