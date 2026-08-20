import { useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Search, Share2 } from 'lucide-react';
import { usePlants } from '../hooks/usePlants';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useUserStore } from '../stores/userStore';
import { notifyError, notifySuccess } from '../lib/errorHandling';
import { CATEGORY_META } from '../lib/plantMeta';
import { careUrgencyRank } from '../lib/careSchedule';
import PlantCard from '../components/plants/PlantCard';
import PlantCardSkeleton from '../components/plants/PlantCardSkeleton';
import PlantListItem from '../components/plants/PlantListItem';
import AddPlantModal from '../components/plants/AddPlantModal';
import type { Plant, PlantCategory } from '../types';

type CatalogueTab = 'plants' | 'wishlist';
type CategoryFilter = PlantCategory | 'all';
type SortOption = 'recent' | 'az' | 'care';
type ViewMode = 'grid' | 'list';

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...(Object.keys(CATEGORY_META) as PlantCategory[]).map((value) => ({
    value,
    label: CATEGORY_META[value].label,
  })),
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'az', label: 'A–Z' },
  { value: 'care', label: 'Needs Care Soonest' },
];

function displayName(plant: Plant) {
  return plant.nickname || plant.common_name;
}

function sortPlants(plants: Plant[], sort: SortOption): Plant[] {
  const copy = [...plants];
  switch (sort) {
    case 'az':
      return copy.sort((a, b) => displayName(a).localeCompare(displayName(b)));
    case 'care':
      return copy.sort((a, b) => careUrgencyRank(a) - careUrgencyRank(b));
    case 'recent':
    default:
      return copy.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

function Catalogue() {
  useDocumentTitle('My Plants — GardenMate');
  const userId = useUserStore((state) => state.user?.id);
  const [catalogueTab, setCatalogueTab] = useState<CatalogueTab>('plants');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [petSafeOnly, setPetSafeOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortOption>('recent');
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { plants, wishlist, isLoading, error, addPlant } = usePlants();
  const sourcePlants = catalogueTab === 'plants' ? plants : wishlist;

  const categoryFiltered = useMemo(() => {
    const byCategory =
      category === 'all' ? sourcePlants : sourcePlants.filter((plant) => plant.category === category);
    return petSafeOnly ? byCategory.filter((plant) => plant.pet_safety === 'safe') : byCategory;
  }, [sourcePlants, category, petSafeOnly]);

  const searched = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return categoryFiltered;
    return categoryFiltered.filter((plant) =>
      [plant.nickname, plant.common_name].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [categoryFiltered, debouncedSearch]);

  const sorted = useMemo(() => sortPlants(searched, sort), [searched, sort]);

  const isCatalogueEmpty = !isLoading && sourcePlants.length === 0;
  const hasNoResults = !isLoading && sourcePlants.length > 0 && sorted.length === 0;

  async function handleShareWishlist() {
    if (!userId) return;
    const url = `${window.location.origin}/wishlist/${userId}`;
    try {
      await navigator.clipboard.writeText(url);
      notifySuccess('Wishlist link copied!');
    } catch {
      notifyError('Could not copy the link. Please try again.');
    }
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 space-y-3 border-b border-neutral-200 bg-white/95 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">My Garden</h1>
          {catalogueTab === 'wishlist' && (
            <button
              type="button"
              onClick={handleShareWishlist}
              className="flex items-center gap-1.5 rounded-full border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Wishlist
            </button>
          )}
        </div>

        <div className="flex rounded-xl border border-neutral-300 p-0.5 dark:border-neutral-700">
          <button
            type="button"
            onClick={() => setCatalogueTab('plants')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              catalogueTab === 'plants'
                ? 'bg-green-600 text-white'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            My Plants
          </button>
          <button
            type="button"
            onClick={() => setCatalogueTab('wishlist')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              catalogueTab === 'wishlist'
                ? 'bg-green-600 text-white'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            Wishlist
          </button>
        </div>

        <div className="relative">
          <label htmlFor="catalogue-search" className="sr-only">
            Search your plants
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            id="catalogue-search"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search your plants…"
            className="w-full rounded-xl border border-neutral-300 py-2.5 pl-9 pr-3 focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setCategory(filter.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                category === filter.value
                  ? 'border-green-600 bg-green-600 text-white'
                  : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPetSafeOnly((v) => !v)}
            aria-pressed={petSafeOnly}
            className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              petSafeOnly
                ? 'border-green-600 bg-green-600 text-white'
                : 'border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300'
            }`}
          >
            🐾 Pet Safe Only
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <label htmlFor="catalogue-sort" className="sr-only">
            Sort plants
          </label>
          <select
            id="catalogue-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl border border-neutral-300 p-0.5 dark:border-neutral-700">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`rounded-lg p-1.5 ${
                viewMode === 'grid'
                  ? 'bg-green-600 text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`rounded-lg p-1.5 ${
                viewMode === 'list'
                  ? 'bg-green-600 text-white'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <PlantCardSkeleton key={i} />
            ))}
          </div>
        ) : isCatalogueEmpty ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-6xl">{catalogueTab === 'wishlist' ? '💚' : '🌱'}</span>
            <p className="text-neutral-500">
              {catalogueTab === 'wishlist'
                ? 'No wishlist plants yet — mark a plant as wishlisted to see it here.'
                : 'No plants yet 🌱 — tap + to add your first one'}
            </p>
          </div>
        ) : hasNoResults ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">🔍</span>
            <p className="text-neutral-500">No plants match your search or filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4">
            {sorted.map((plant) => (
              <PlantCard key={plant.id} plant={plant} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((plant) => (
              <PlantListItem key={plant.id} plant={plant} />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        aria-label="Add plant"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </button>

      <AddPlantModal open={isAddOpen} onClose={() => setIsAddOpen(false)} onAdd={addPlant} />
    </div>
  );
}

export default Catalogue;
