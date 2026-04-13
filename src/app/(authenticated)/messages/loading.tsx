import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <Skeleton className="h-8 w-40" />
      {/* Two-panel message layout */}
      <div className="bg-card border border-border rounded-xl overflow-hidden h-[calc(100dvh-12rem)] flex">
        {/* Thread list */}
        <div className="w-full sm:w-80 border-r border-border flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-border">
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
          <div className="flex-1 space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 border-b border-border">
                <div className="flex items-start gap-2">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Conversation area */}
        <div className="flex-1 hidden sm:flex items-center justify-center">
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}
