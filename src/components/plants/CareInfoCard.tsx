import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Droplets, Sun, Thermometer } from 'lucide-react';
import { searchPlantsResilient, getPlantDetails } from '../../lib/perenual';
import { deriveCareInfo } from '../../lib/careInfo';
import type { CareInfo } from '../../lib/careInfo';
import type { PetSafety } from '../../types';

type Status = 'loading' | 'success' | 'not-found';

interface CareInfoCardProps {
  scientificName?: string | null;
  speciesId?: number;
  // Pet Safety Quick View: when provided, a resolved petSafe flag is reported
  // back via callback the first time it loads, so the caller (PlantDetail,
  // which already has updatePlant in scope) can cache it onto the plant row
  // — deliberately a callback rather than this card calling usePlants()
  // itself, which would re-fetch the plants table on every tab switch.
  currentPetSafety?: PetSafety;
  onPetSafetyResolved?: (safety: 'safe' | 'toxic') => void;
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      {title && <h3 className="mb-2 text-sm font-semibold">{title}</h3>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <p className="text-xs text-neutral-500 dark:text-neutral-400">{text}</p>;
}

function SunDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Sun
          key={i}
          className={
            i <= level ? 'h-3 w-3 text-amber-500' : 'h-3 w-3 text-neutral-300 dark:text-neutral-700'
          }
          fill={i <= level ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

// The three facts someone glances at first — water, light, temperature —
// as a single tight row per fact rather than buried inside a long "Best
// Practices" section further down the page.
function QuickFactRow({
  icon,
  label,
  value,
  extra,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="truncate text-sm font-medium">{value}</p>
      </div>
      {extra}
    </div>
  );
}

function SafetyPill({ safe, safeLabel = 'Safe' }: { safe: boolean | null; safeLabel?: string }) {
  if (safe === null) {
    return <span className="text-xs text-neutral-400">No data</span>;
  }
  return safe ? (
    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
      {safeLabel}
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
      Toxic ⚠️
    </span>
  );
}

function ChipRow({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-400">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function Attribution() {
  return <p className="pt-1 text-center text-xs text-neutral-400">Source: Perenual API</p>;
}

function CareInfoSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-2 rounded-2xl border border-neutral-200 p-3.5 dark:border-neutral-800"
        >
          <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
      <Attribution />
    </div>
  );
}

function NotAvailable() {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="text-3xl">🌱</span>
      <p className="text-sm text-neutral-500">Care info not available for this plant.</p>
      <Attribution />
    </div>
  );
}

function CareInfoCard({
  scientificName,
  speciesId,
  currentPetSafety,
  onPetSafetyResolved,
}: CareInfoCardProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [careInfo, setCareInfo] = useState<CareInfo | null>(null);

  useEffect(() => {
    if (!careInfo || !onPetSafetyResolved || currentPetSafety !== 'unknown') return;
    if (careInfo.bestPractices.petSafe === null) return;
    onPetSafetyResolved(careInfo.bestPractices.petSafe ? 'safe' : 'toxic');
  }, [careInfo, currentPetSafety, onPetSafetyResolved]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      setCareInfo(null);

      const trimmedName = scientificName?.trim();
      if (!speciesId && !trimmedName) {
        if (!cancelled) setStatus('not-found');
        return;
      }

      let id = speciesId;
      if (!id && trimmedName) {
        const results = await searchPlantsResilient(trimmedName);
        id = results[0]?.id;
      }

      if (!id) {
        if (!cancelled) setStatus('not-found');
        return;
      }

      const details = await getPlantDetails(id);
      if (cancelled) return;

      if (!details) {
        setStatus('not-found');
        return;
      }

      setCareInfo(deriveCareInfo(details));
      setStatus('success');
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [scientificName, speciesId]);

  if (status === 'loading') return <CareInfoSkeleton />;
  if (status === 'not-found' || !careInfo) return <NotAvailable />;

  const hasPests = careInfo.bestPractices.pests.length > 0;
  const hasDiseases = careInfo.bestPractices.diseases.length > 0;

  return (
    <div className="space-y-3">
      <Card>
        <QuickFactRow
          icon={<Droplets className="h-4 w-4" />}
          label="Water"
          value={careInfo.watering.frequency}
        />
        <QuickFactRow
          icon={<Sun className="h-4 w-4" />}
          label="Light"
          value={careInfo.bestPractices.sunlightLabel}
          extra={<SunDots level={careInfo.bestPractices.sunLevel} />}
        />
        <QuickFactRow
          icon={<Thermometer className="h-4 w-4" />}
          label="Temperature"
          value={careInfo.bestPractices.temperatureRange}
        />
        <div className="mt-1 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <span className="text-xs text-neutral-500">Pet safety</span>
          <SafetyPill safe={careInfo.bestPractices.petSafe} safeLabel="Safe 🐾" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-500">Human safety</span>
          <SafetyPill safe={careInfo.bestPractices.humanSafe} />
        </div>
      </Card>

      <Card title="💧 Watering & Feeding">
        <Row label="Soil moisture" value={careInfo.watering.soilMoisture} />
        <Row label="Method" value={careInfo.watering.method} />
        <Note text={careInfo.watering.overwateringSigns} />
        <Note text={careInfo.watering.underwateringSigns} />
        <div className="mt-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
          <Row label="Fertiliser" value={careInfo.feeding.fertiliserType} />
          <Row label="Frequency" value={careInfo.feeding.frequency} />
          <Note text={careInfo.feeding.winterNote} />
        </div>
      </Card>

      <Card title="✂️ Pruning">
        <Row label="Best time" value={careInfo.pruning.bestTime} />
        <Row label="Method" value={careInfo.pruning.method} />
        <Note text={careInfo.pruning.instructions} />
      </Card>

      <Card title="🌱 Propagation">
        {careInfo.propagation.methods.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {careInfo.propagation.methods.map((method) => (
                <span
                  key={method}
                  className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300"
                >
                  {method}
                </span>
              ))}
            </div>
            <Row label="Best season" value={careInfo.propagation.bestSeason} />
            {careInfo.propagation.primaryMethod && (
              <div className="pt-1">
                <p className="mb-1 text-sm font-medium">
                  How to propagate by {careInfo.propagation.primaryMethod.toLowerCase()}
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-400">
                  {careInfo.propagation.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">No propagation data available.</p>
        )}
      </Card>

      {careInfo.harvesting && (
        <Card title="🧺 Harvesting">
          <Row label="Timing" value={careInfo.harvesting.daysToHarvest} />
          <Note text={careInfo.harvesting.visualCues} />
          <Note text={careInfo.harvesting.howTo} />
          <Note text={careInfo.harvesting.storageTips} />
          <Note text={careInfo.harvesting.successionNote} />
        </Card>
      )}

      {(hasPests || hasDiseases) && (
        <Card title="🐛 Pests & Diseases">
          {hasPests && (
            <div>
              <p className="mb-1 text-xs text-neutral-500">Common pests</p>
              <ChipRow items={careInfo.bestPractices.pests} emptyLabel="" />
            </div>
          )}
          {hasDiseases && (
            <div className={hasPests ? 'mt-2' : undefined}>
              <p className="mb-1 text-xs text-neutral-500">Common diseases</p>
              <ChipRow items={careInfo.bestPractices.diseases} emptyLabel="" />
            </div>
          )}
        </Card>
      )}

      <Attribution />
    </div>
  );
}

export default CareInfoCard;
