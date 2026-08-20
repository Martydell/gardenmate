import { Camera } from 'lucide-react';
import type { ChangeEvent } from 'react';

interface AvatarUploaderProps {
  avatarUrl: string | null;
  displayName: string;
  isUploading: boolean;
  onSelectFile: (file: File) => void;
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '🌱';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function AvatarUploader({ avatarUrl, displayName, isUploading, onSelectFile }: AvatarUploaderProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onSelectFile(file);
  }

  return (
    <label className="relative block h-24 w-24 shrink-0 cursor-pointer">
      <div className="h-24 w-24 overflow-hidden rounded-full bg-green-100 dark:bg-green-950">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-green-800 dark:text-green-300">
            {initialsFor(displayName)}
          </div>
        )}
      </div>
      <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-600 text-white dark:border-neutral-950">
        {isUploading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </span>
      <input
        type="file"
        accept="image/*"
        aria-label="Change profile photo"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
    </label>
  );
}

export default AvatarUploader;
