import type { GrowthStage, PlantStageRecord } from '../types';

export const GROWTH_STAGES: GrowthStage[] = [
  'seed',
  'germination',
  'seedling',
  'juvenile',
  'mature',
  'flowering',
  'fruiting_harvesting',
];

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  seed: 'Seed',
  germination: 'Germination',
  seedling: 'Seedling',
  juvenile: 'Juvenile',
  mature: 'Mature',
  flowering: 'Flowering',
  fruiting_harvesting: 'Fruiting/Harvesting',
};

// A plant with no stage history yet is implicitly at "Seed" (index 0) —
// "Advance Stage" records the transition INTO the next stage, so the first
// ever record is for 'germination', not a redundant no-op 'seed' row.
export function getCurrentStageIndex(stages: PlantStageRecord[]): number {
  if (stages.length === 0) return 0;
  const latest = stages[stages.length - 1];
  const index = GROWTH_STAGES.indexOf(latest.stage);
  return index === -1 ? 0 : index;
}
