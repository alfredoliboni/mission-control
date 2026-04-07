"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DemoBanner } from "./DemoBanner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <DemoBanner />
        <TopBar />
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
        >
          <div className="mx-auto max-w-[1280px] p-4 sm:p-6 md:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      <ChatBubble />
    </div>
  );
}
