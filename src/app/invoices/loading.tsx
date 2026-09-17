import { Skeleton, TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-40" /><Skeleton className="h-3 w-56" /></div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="mb-4 h-24 w-full" />
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
