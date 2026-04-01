"use client";

import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";

export default function OntarioSystemPage() {
  const { data: content, isLoading } = useWorkspaceFile("ontario-system.md");

  return (
    <WorkspaceSection
      title="Ontario System"
      icon="🏛️"
      isLoading={isLoading}
    >
      {content && <MarkdownRenderer content={content} />}
    </WorkspaceSection>
  );
}
