import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      {/* Search + filters */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 flex-1 max-w-sm rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
      {/* Two-panel document layout */}
      <div className="flex gap-4 h-[calc(100dvh-14rem)]">
        {/* Document list */}
        <div className="w-full sm:w-80 lg:w-96 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {/* Detail panel */}
        <div className="flex-1 hidden sm:block">
          <Skeleton className="h-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
