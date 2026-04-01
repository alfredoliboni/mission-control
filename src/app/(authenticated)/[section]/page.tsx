"use client";

import { useParams } from "next/navigation";
import { useWorkspaceFile } from "@/hooks/useWorkspace";
import { WorkspaceSection } from "@/components/workspace/WorkspaceSection";
import { MarkdownRenderer } from "@/components/workspace/MarkdownRenderer";

function titleCase(str: string): string {
  return str
    .replace(/-/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function DynamicSectionPage() {
  const params = useParams();
  const section = params.section as string;
  const filename = `${section}.md`;
  const { data: content, isLoading, error } = useWorkspaceFile(filename);

  if (error) {
    return (
      <WorkspaceSection title={titleCase(section)} icon="📋">
        <p className="text-sm text-warm-400 py-8 text-center">
          This section is not available yet. The agent will create it when
          relevant.
        </p>
      </WorkspaceSection>
    );
  }

  return (
    <WorkspaceSection
      title={titleCase(section)}
      icon="📋"
      isLoading={isLoading}
    >
      {content && <MarkdownRenderer content={content} />}
    </WorkspaceSection>
  );
}
