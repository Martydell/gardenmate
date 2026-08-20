import { useParams } from 'react-router-dom';
import { usePublicWishlist } from '../hooks/usePublicWishlist';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { Plant } from '../types';

function displayName(plant: Plant): string {
  return plant.nickname || plant.common_name;
}

function WishlistCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
      <div className="aspect-square w-full animate-pulse bg-neutral-200 dark:bg-neutral-800" />
      <div className="p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}

// Public, unauthenticated page — no owner name/garden name is shown since
// that data lives only in Supabase auth metadata, which has no public-read
// path without a dedicated profiles table (not something this app has).
function PublicWishlist() {
  useDocumentTitle('Wishlist — GardenMate');
  const { userId } = useParams<{ userId: string }>();
  const { plants, isLoading, error } = usePublicWishlist(userId);

  return (
    <div className="mx-auto min-h-svh max-w-lg p-4 pb-10">
      <div className="py-6 text-center">
        <span className="text-4xl" aria-hidden="true">
          🌿
        </span>
        <h1 className="mt-2 text-2xl font-semibold">Plant Wishlist</h1>
        <p className="mt-1 text-sm text-neutral-500">Shared from GardenMate</p>
      </div>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <WishlistCardSkeleton key={i} />
          ))}
        </div>
      ) : plants.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="text-5xl">🌱</span>
          <p className="text-neutral-500">This wishlist is empty right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {plants.map((plant) => (
            <div
              key={plant.id}
              className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="aspect-square w-full bg-green-100 dark:bg-green-950">
                {plant.cover_photo_url ? (
                  <img
                    src={plant.cover_photo_url}
                    alt={displayName(plant)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">🌿</div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate font-medium">{displayName(plant)}</p>
                {plant.scientific_name && (
                  <p className="truncate text-xs italic text-neutral-500">{plant.scientific_name}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-neutral-400">Built with GardenMate 🌿</p>
    </div>
  );
}

export default PublicWishlist;
