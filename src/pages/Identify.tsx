import { formatDate } from '../lib/careSchedule';
import { useIdentificationLog } from '../hooks/useIdentificationLog';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function Identify() {
  useDocumentTitle('Identify — GardenMate');
  const { logs, isLoading } = useIdentificationLog();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Identify</h1>
      <p className="mt-2 text-neutral-500">Snap a photo to identify a plant.</p>

      <div className="mt-8">
        <h2 className="mb-2 font-semibold">ID Log</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-5xl">🔍</span>
            <p className="text-neutral-500">No identifications yet — point your camera at a plant! 🔍</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <img src={log.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{log.result_name}</p>
                  <p className="text-xs text-neutral-500">
                    {Math.round(log.confidence * 100)}% confident · {formatDate(log.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Identify;
