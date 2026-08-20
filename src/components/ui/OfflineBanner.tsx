import { useOnlineStatus } from '../../hooks/useOnlineStatus';

function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
    >
      You're offline — showing cached data
    </div>
  );
}

export default OfflineBanner;
