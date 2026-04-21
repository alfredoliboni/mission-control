"use client";

import { cn } from "@/lib/utils";

export interface PatientRow {
  linkId: string;
  familyId: string;
  childAgentId: string;
  childName: string;
  familyName: string;
  status: "active" | "former";
  unreadCount: number;
  lastMessage: { content: string; createdAt: string } | null;
}

interface Props {
  patients: PatientRow[];
  selectedId: string | null;
  onSelect: (linkId: string) => void;
}

export function PatientList({ patients, selectedId, onSelect }: Props) {
  if (patients.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No patients linked yet. Ask a family to invite you.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Patients
      </div>
      {patients.map((p) => {
        const selected = p.linkId === selectedId;
        const isFormer = p.status === "former";
        return (
          <button
            key={p.linkId}
            type="button"
            onClick={() => onSelect(p.linkId)}
            className={cn(
              "flex flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors",
              "hover:bg-muted/50",
              selected && "bg-primary/5 border-l-2 border-primary",
              isFormer && "opacity-60"
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] font-semibold text-foreground truncate">
                  {p.childName}
                </span>
                {isFormer && (
                  <span
                    title="Read-only — history preserved."
                    className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0"
                  >
                    Inactive
                  </span>
                )}
              </div>
              {p.unreadCount > 0 && (
                <span className="text-[10px] font-bold text-primary-foreground bg-primary rounded-full px-2 py-0.5 min-w-[18px] text-center">
                  {p.unreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground">
              {p.familyName} family
            </span>
            {p.lastMessage && (
              <span className="text-[11px] text-muted-foreground truncate w-full">
                {p.lastMessage.content}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
