function PlantCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="aspect-square w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-4 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

export default PlantCardSkeleton;
