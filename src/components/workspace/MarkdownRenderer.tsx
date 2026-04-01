"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const components: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-heading text-xl font-semibold text-foreground mt-8 mb-3 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-heading text-lg font-semibold text-foreground mt-6 mb-2">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-heading text-base font-semibold text-foreground mt-4 mb-2">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-foreground leading-relaxed mb-3">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="text-sm space-y-1 mb-3 ml-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-sm space-y-1 mb-3 ml-1 list-decimal list-inside">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => {
    // Check for checkbox items
    const className = props.className;
    if (className?.includes("task-list-item")) {
      return (
        <li className="flex items-start gap-2 list-none">{children}</li>
      );
    }
    return (
      <li className="flex items-start gap-2">
        <span className="text-warm-300 mt-1.5 shrink-0">•</span>
        <span>{children}</span>
      </li>
    );
  },
  input: ({ checked, ...props }) => {
    if (props.type === "checkbox") {
      return (
        <span
          className={cn(
            "inline-flex items-center justify-center h-4 w-4 rounded border shrink-0 mt-0.5",
            checked
              ? "bg-status-success border-status-success text-white"
              : "border-warm-300 bg-white"
          )}
          aria-checked={checked}
          role="checkbox"
        >
          {checked && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 6L5 8.5L9.5 3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      );
    }
    return <input {...props} />;
  },
  table: ({ children }) => (
    <div className="rounded-xl border border-border overflow-hidden mb-4">
      <Table>{children}</Table>
    </div>
  ),
  thead: ({ children }) => <TableHeader>{children}</TableHeader>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableHead className="text-xs font-semibold text-warm-400 uppercase tracking-wider">
      {children}
    </TableHead>
  ),
  td: ({ children }) => (
    <TableCell className="text-sm">{children}</TableCell>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-warm-400">{children}</em>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block bg-warm-100 rounded-lg p-4 text-sm font-mono overflow-x-auto mb-3">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-warm-100 rounded px-1.5 py-0.5 text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="mb-3">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-3 text-warm-400 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
};

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-custom">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
