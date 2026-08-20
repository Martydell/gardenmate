export type GardenType = 'indoor' | 'outdoor' | 'hydroponics' | 'greenhouse' | 'balcony';

export type Theme =
  | 'Cottage Garden'
  | 'Urban Jungle'
  | 'Mediterranean'
  | 'Minimalist Modern'
  | 'Kitchen Garden'
  | 'Tropical';

export interface NotificationPreferences {
  wateringRemindersEnabled: boolean;
  wateringTime: string;
  feedingRemindersEnabled: boolean;
  feedingTime: string;
  weeklyDigestEnabled: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  garden_name: string;
  theme: Theme | null;
  garden_types: GardenType[];
  avatar_url: string | null;
  notification_preferences: NotificationPreferences | null;
  created_at: string;
}

export type PlantCategory = 'indoor' | 'outdoor' | 'hydroponics' | 'greenhouse' | 'balcony';

export type PlantStatus = 'seedling' | 'growing' | 'mature' | 'dormant';

export type PlantSource = 'seed' | 'seedling' | 'shop_bought' | 'propagated' | 'gifted';

// 'unknown' (not null) is the default so every render site can treat this as
// a plain 3-way enum instead of a nullable field — populated opportunistically
// from the Perenual API the first time a plant's Care Info tab is viewed
// (see components/plants/CareInfoCard.tsx), not fetched in bulk.
export type PetSafety = 'safe' | 'toxic' | 'unknown';

export interface Plant {
  id: string;
  user_id: string;
  common_name: string;
  scientific_name: string | null;
  nickname: string | null;
  category: PlantCategory;
  location_id: string | null;
  status: PlantStatus;
  source: PlantSource;
  date_acquired: string | null;
  date_planted: string | null;
  pot_size: string | null;
  soil_type: string | null;
  last_watered: string | null;
  last_fed: string | null;
  notes: string | null;
  is_wishlist: boolean;
  cover_photo_url: string | null;
  photos: string[];
  pet_safety: PetSafety;
  // User-declared (not Perenual-derived) — see lib/careInfo.ts's isEdible()
  // for why: pet safety needs an external data source, but a grower usually
  // already knows whether their own plant is edible and wants the Harvest
  // quick-action available immediately, not gated behind visiting Care Info.
  is_edible: boolean;
  created_at: string;
}

export type GardenSpaceType =
  | 'indoor_room'
  | 'outdoor_garden'
  | 'raised_bed'
  | 'allotment'
  | 'balcony';

export type GroundCoverType = 'grass' | 'decking' | 'concrete' | 'bark' | 'gravel' | 'paving';

export type WaterNeedLevel = 'high' | 'medium' | 'low';

export interface GardenSpace {
  id: string;
  user_id: string;
  name: string;
  type: GardenSpaceType;
  canvas_json: Record<string, unknown> | null;
  photos: string[];
  created_at: string;
}

export type CareActionType = 'watered' | 'fed' | 'pruned' | 'harvested' | 'sown';

export interface CareLog {
  id: string;
  plant_id: string;
  user_id: string;
  action_type: CareActionType;
  notes: string | null;
  photo_url: string | null;
  logged_at: string;
}

export type CareTaskType = 'water' | 'feed' | 'prune' | 'harvest' | 'succession';

export interface CareTask {
  id: string;
  plant_id: string;
  user_id: string;
  task_type: CareTaskType;
  due_date: string;
  completed: boolean;
  snoozed_until: string | null;
  repeat_interval_days: number | null;
  notes: string | null;
  created_at: string;
}

export type HarvestUnit = 'g' | 'kg' | 'items' | 'bunches';

export interface HarvestLogEntry {
  id: string;
  plant_id: string;
  user_id: string;
  quantity: number;
  unit: HarvestUnit;
  photo_url: string | null;
  notes: string | null;
  harvested_at: string;
}

export type SpacePhotoAngleLabel =
  | 'North wall'
  | 'South wall'
  | 'East wall'
  | 'West wall'
  | 'Overhead'
  | 'Entrance view'
  | 'Custom';

export interface SpacePhotoAnglePin {
  id: string;
  x: number;
  y: number;
  plant_id: string;
  plant_name: string;
}

export interface SpacePhotoAngle {
  id: string;
  space_id: string;
  user_id: string;
  label: SpacePhotoAngleLabel;
  custom_label: string | null;
  photo_url: string;
  pins: SpacePhotoAnglePin[];
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  plant_id: string | null;
  plant_name: string;
  poster_name: string;
  before_photo_url: string;
  after_photo_url: string;
  caption: string | null;
  is_public: boolean;
  created_at: string;
}

export interface IdentificationLog {
  id: string;
  user_id: string;
  photo_url: string;
  result_name: string;
  confidence: number;
  created_at: string;
}

export type GrowthStage =
  | 'seed'
  | 'germination'
  | 'seedling'
  | 'juvenile'
  | 'mature'
  | 'flowering'
  | 'fruiting_harvesting';

export interface PlantStageRecord {
  id: string;
  plant_id: string;
  user_id: string;
  stage: GrowthStage;
  note: string | null;
  photo_url: string | null;
  recorded_at: string;
}

// 'date_acquired' is deliberately not a milestone type here — it's derived
// live from Plant.date_acquired (see MilestonesPanel) rather than stored as
// its own row, to avoid two copies of the same fact drifting out of sync.
export type MilestoneType =
  | 'first_sprout'
  | 'first_true_leaves'
  | 'first_flower'
  | 'first_harvest'
  | 'date_repotted';

export interface PlantMilestone {
  id: string;
  plant_id: string;
  user_id: string;
  milestone_type: MilestoneType;
  occurred_on: string;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface PlantProgressPhoto {
  id: string;
  plant_id: string;
  user_id: string;
  photo_url: string;
  note: string | null;
  taken_on: string;
  created_at: string;
}

// Perenual API (https://perenual.com/docs/api) — external species-data shapes,
// not GardenMate database rows. Fields are a subset of the real response,
// covering what lib/careInfo.ts needs to derive displayable care guidance.
export interface PerenualImage {
  original_url: string | null;
  regular_url: string | null;
  medium_url: string | null;
  small_url: string | null;
  thumbnail: string | null;
}

export interface PerenualHardiness {
  min: string;
  max: string;
}

export interface PerenualWateringBenchmark {
  value: string;
  unit: string;
}

export interface PerenualSpeciesSummary {
  id: number;
  common_name: string | null;
  scientific_name: string[];
  other_name: string[];
  cycle: string | null;
  watering: string | null;
  sunlight: string[];
  default_image: PerenualImage | null;
}

export interface PerenualSpeciesDetails extends PerenualSpeciesSummary {
  family: string | null;
  origin: string[];
  type: string | null;
  propagation: string[];
  hardiness: PerenualHardiness | null;
  watering_general_benchmark: PerenualWateringBenchmark | null;
  pruning_month: string[];
  maintenance: string | null;
  care_level: string | null;
  growth_rate: string | null;
  soil: string[];
  drought_tolerant: boolean;
  indoor: boolean;
  tropical: boolean;
  pest_susceptibility: string[];
  flowers: boolean;
  flowering_season: string | null;
  fruits: boolean;
  edible_fruit: boolean;
  harvest_season: string | null;
  edible_leaf: boolean;
  cuisine: boolean;
  poisonous_to_humans: number | null;
  poisonous_to_pets: number | null;
  description: string | null;
}

export type AchievementId =
  | 'first_steps'
  | 'week_streak'
  | 'plant_detective'
  | 'growing_collection'
  | 'photographer'
  | 'garden_mapper'
  | 'dedicated_gardener'
  | 'hydration_hero'
  | 'harvest_time'
  | 'propagator';

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: AchievementId;
  earned_at: string;
}
