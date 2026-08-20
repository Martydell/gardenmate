function PlantDetailSkeleton() {
  return (
    <div className="pb-24" role="status" aria-label="Loading plant">
      <div className="aspect-[4/3] w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
      <div className="px-4 pt-4">
        <div className="h-7 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-4 w-28 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-3 flex gap-2">
          <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-b border-neutral-200 px-4 pb-3 dark:border-neutral-800">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-4 flex-1 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    </div>
  );
}

export default PlantDetailSkeleton;
