import { GROWTH_STAGE_LABELS } from './growthStages';
import { MILESTONE_TYPE_META } from './milestoneMeta';
import type { PlantMilestone, PlantProgressPhoto, PlantStageRecord } from '../types';

export interface ProgressPhotoEntry {
  id: string;
  url: string;
  date: string;
  note: string | null;
  sourceLabel: string;
}

// The Photo Journal shows every photo tied to this plant's progress —
// standalone snapshots plus any photo attached when advancing a stage or
// logging a milestone — merged into one chronological list.
export function mergeProgressPhotos(
  progressPhotos: PlantProgressPhoto[],
  stages: PlantStageRecord[],
  milestones: PlantMilestone[],
): ProgressPhotoEntry[] {
  const entries: ProgressPhotoEntry[] = [];

  for (const photo of progressPhotos) {
    entries.push({
      id: `photo-${photo.id}`,
      url: photo.photo_url,
      date: photo.taken_on,
      note: photo.note,
      sourceLabel: 'Progress photo',
    });
  }

  for (const stage of stages) {
    if (!stage.photo_url) continue;
    entries.push({
      id: `stage-${stage.id}`,
      url: stage.photo_url,
      date: stage.recorded_at.slice(0, 10),
      note: stage.note,
      sourceLabel: `Advanced to ${GROWTH_STAGE_LABELS[stage.stage]}`,
    });
  }

  for (const milestone of milestones) {
    if (!milestone.photo_url) continue;
    entries.push({
      id: `milestone-${milestone.id}`,
      url: milestone.photo_url,
      date: milestone.occurred_on,
      note: milestone.note,
      sourceLabel: MILESTONE_TYPE_META[milestone.milestone_type].label,
    });
  }

  return entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
