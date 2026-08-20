import { PET_SAFETY_BANNER_META } from '../../lib/petSafety';
import type { PetSafety } from '../../types';

function PetSafetyBanner({ safety }: { safety: PetSafety }) {
  const meta = PET_SAFETY_BANNER_META[safety];
  return <div className={`rounded-2xl px-4 py-3 text-sm font-medium ${meta.className}`}>{meta.text}</div>;
}

export default PetSafetyBanner;
