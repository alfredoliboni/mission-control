"use client";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { DemoBanner } from "./DemoBanner";
import { ChatBubble } from "@/components/chat/ChatBubble";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DemoBanner />
        <TopBar />
        <main
          className="flex-1 overflow-y-auto"
          id="main-content"
        >
          <div className="mx-auto max-w-[1280px] p-6 sm:p-8">
            {children}
          </div>
        </main>
      </div>
      <ChatBubble />
    </div>
  );
}
