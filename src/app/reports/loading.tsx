import { Skeleton, StatCardsSkeleton, TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="mb-5 space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-72" /></div>
      <StatCardsSkeleton />
      <div className="mt-4"><TableSkeleton rows={6} cols={5} /></div>
    </div>
  );
}
