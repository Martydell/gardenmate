import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Sun } from 'lucide-react';
import { searchPlants, getPlantDetails } from '../../lib/perenual';
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function TipBlock({ label, text }: { label: string; text: string }) {
  return (
    <p className="text-sm">
      <span className="font-medium">{label}: </span>
      <span className="text-neutral-600 dark:text-neutral-400">{text}</span>
    </p>
  );
}

function SunRow({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Sun
          key={i}
          className={
            i <= level ? 'h-4 w-4 text-amber-500' : 'h-4 w-4 text-neutral-300 dark:text-neutral-700'
          }
          fill={i <= level ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}

function SafetyBadge({
  safe,
  safeLabel = 'SAFE',
}: {
  safe: boolean | null;
  safeLabel?: string;
}) {
  if (safe === null) {
    return <span className="text-sm text-neutral-500">No data</span>;
  }
  return safe ? (
    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-300">
      {safeLabel}
    </span>
  ) : (
    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950 dark:text-red-300">
      TOXIC ⚠️
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
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-2 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800"
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
        const results = await searchPlants(trimmedName);
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

  return (
    <div className="space-y-4">
      <Section title="💧 Watering">
        <InfoRow label="Frequency" value={careInfo.watering.frequency} />
        <InfoRow label="Soil moisture" value={careInfo.watering.soilMoisture} />
        <InfoRow label="Method" value={careInfo.watering.method} />
        <TipBlock label="Overwatering signs" text={careInfo.watering.overwateringSigns} />
        <TipBlock label="Underwatering signs" text={careInfo.watering.underwateringSigns} />
      </Section>

      <Section title="🌿 Feeding">
        <InfoRow label="Fertiliser" value={careInfo.feeding.fertiliserType} />
        <InfoRow label="Frequency" value={careInfo.feeding.frequency} />
        <p className="text-sm text-neutral-500">{careInfo.feeding.winterNote}</p>
      </Section>

      <Section title="✂️ Pruning">
        <InfoRow label="Best time" value={careInfo.pruning.bestTime} />
        <InfoRow label="Method" value={careInfo.pruning.method} />
        <p className="text-sm text-neutral-500">{careInfo.pruning.instructions}</p>
      </Section>

      <Section title="🌱 Propagation">
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
            <InfoRow label="Best season" value={careInfo.propagation.bestSeason} />
            {careInfo.propagation.primaryMethod && (
              <div>
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
      </Section>

      {careInfo.harvesting && (
        <Section title="🧺 Harvesting">
          <InfoRow label="Timing" value={careInfo.harvesting.daysToHarvest} />
          <TipBlock label="Visual cues" text={careInfo.harvesting.visualCues} />
          <TipBlock label="How to harvest" text={careInfo.harvesting.howTo} />
          <TipBlock label="Storage" text={careInfo.harvesting.storageTips} />
          <p className="text-sm text-neutral-500">{careInfo.harvesting.successionNote}</p>
        </Section>
      )}

      <Section title="🌤️ Best Practices">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Light</span>
          <SunRow level={careInfo.bestPractices.sunLevel} />
        </div>
        <InfoRow label="Sunlight" value={careInfo.bestPractices.sunlightLabel} />
        <InfoRow label="Temperature" value={careInfo.bestPractices.temperatureRange} />
        <InfoRow label="Humidity" value={careInfo.bestPractices.humidity} />
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-neutral-500">Pet safety</span>
          <SafetyBadge safe={careInfo.bestPractices.petSafe} safeLabel="SAFE 🐾" />
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-neutral-500">Human safety</span>
          <SafetyBadge safe={careInfo.bestPractices.humanSafe} safeLabel="SAFE" />
        </div>
        <div>
          <p className="mb-1 text-sm text-neutral-500">Common pests</p>
          <ChipRow items={careInfo.bestPractices.pests} emptyLabel="No common pests listed" />
        </div>
        <div>
          <p className="mb-1 text-sm text-neutral-500">Common diseases</p>
          <ChipRow items={careInfo.bestPractices.diseases} emptyLabel="No common diseases listed" />
        </div>
      </Section>

      <Attribution />
    </div>
  );
}

export default CareInfoCard;
