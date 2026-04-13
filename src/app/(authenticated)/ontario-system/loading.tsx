import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-40" />
      {/* Intro card */}
      <Skeleton className="h-20 rounded-xl" />
      {/* Timeline steps */}
      <div className="space-y-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 py-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-64" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
