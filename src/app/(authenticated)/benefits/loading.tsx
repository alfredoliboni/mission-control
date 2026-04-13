import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-40" />
      {/* Kanban columns */}
      <div className="grid md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div
            key={col}
            className="bg-card border border-border rounded-xl p-4 space-y-3"
          >
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
