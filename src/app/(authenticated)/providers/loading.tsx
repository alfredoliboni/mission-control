import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-40" />
      {/* Priority banner */}
      <Skeleton className="h-16 rounded-xl" />
      {/* Tabs */}
      <Skeleton className="h-10 w-72" />
      {/* Map placeholder */}
      <Skeleton className="h-48 rounded-xl" />
      {/* Search */}
      <Skeleton className="h-10 w-80 rounded-lg" />
      {/* Provider cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
