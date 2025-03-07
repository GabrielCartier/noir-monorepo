import { Skeleton } from 'src/components/ui/skeleton';

// TODO Split this
export function TransactionSkeleton() {
  return (
    <div className="flex items-stretch gap-4 p-4 rounded-lg border">
      <div className="flex items-center justify-center w-5">
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-8" />
        </div>
        <div className="space-y-0.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
      </div>
    </div>
  );
}

export function OptionCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="space-y-1">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-24" />
    </div>
  );
}

export function PositionCardSkeleton() {
  return (
    <div className="w-[330px] md:w-[190px] aspect-[3/5] p-4 rounded-lg border">
      <div className="h-full flex flex-col space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>

        {/* Pool info */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Token amounts */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Price range */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Button at bottom */}
        <div className="mt-auto pt-2">
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </div>
  );
}
