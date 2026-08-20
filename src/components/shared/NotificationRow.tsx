import Toggle from '../ui/Toggle';

interface NotificationRowProps {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  time?: string;
  onTimeChange?: (time: string) => void;
}

function NotificationRow({ label, enabled, onToggle, time, onTimeChange }: NotificationRowProps) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <Toggle checked={enabled} onChange={onToggle} label={label} />
      </div>
      {enabled && time !== undefined && onTimeChange && (
        <input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          aria-label={`${label} time`}
          className="mt-3 rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      )}
    </div>
  );
}

export default NotificationRow;
