import { PET_SAFETY_BADGE_META } from '../../lib/petSafety';
import type { PetSafety } from '../../types';

function PetSafetyBadge({ safety }: { safety: PetSafety }) {
  const meta = PET_SAFETY_BADGE_META[safety];
  return (
    <span
      role="img"
      aria-label={meta.label}
      title={meta.label}
      className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-xs text-white shadow ${meta.colorClassName}`}
    >
      {meta.emoji}
    </span>
  );
}

export default PetSafetyBadge;
