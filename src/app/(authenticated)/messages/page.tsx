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
      {content && <MarkdownRenderer content={content} />}
    </WorkspaceSection>
  );
}
