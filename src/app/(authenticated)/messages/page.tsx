"use client";

import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";

export default function MessagesPage() {
  const { data: content, isLoading } = useWorkspaceFile("messages.md");

  return (
    <WorkspaceSection
      title="Messages"
      icon="💬"
      isLoading={isLoading}
    >
      {content && (
        <div className="bg-card border border-border rounded-xl p-5">
          <MarkdownRenderer content={content} />
        </div>
      )}
    </WorkspaceSection>
  );
}
