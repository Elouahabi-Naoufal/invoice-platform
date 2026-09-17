import { Skeleton, TableSkeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="space-y-2"><Skeleton className="h-6 w-32" /><Skeleton className="h-3 w-52" /></div>
        <Skeleton className="h-9 w-28" />
      </div>
      <TableSkeleton rows={7} cols={4} />
    </div>
  );
}
