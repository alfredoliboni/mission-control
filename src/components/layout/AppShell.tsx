"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DemoBanner } from "./DemoBanner";
import { ApiOfflineBanner } from "./ApiOfflineBanner";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { useAlertNotifications } from "@/hooks/useWorkspace";

export function AppShell({ children }: { children: React.ReactNode }) {
  useAlertNotifications();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DemoBanner />
        <ApiOfflineBanner />
        <TopBar />
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
        >
          <div className="mx-auto max-w-[1280px] p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
      <ChatBubble />
    </div>
  );
}
