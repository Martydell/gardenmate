import { Check } from 'lucide-react';
import { THEME_OPTIONS } from '../../lib/themes';
import type { Theme } from '../../types';

interface ThemePickerProps {
  value: Theme | null;
  onChange: (theme: Theme) => void;
}

function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {THEME_OPTIONS.map((option) => {
        const isSelected = value === option.name;
        return (
          <button
            key={option.name}
            type="button"
            onClick={() => onChange(option.name)}
            className={`relative rounded-2xl border-2 p-4 text-left transition ${
              isSelected ? 'border-green-600' : 'border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="flex h-10 overflow-hidden rounded-lg">
              {option.colors.map((color) => (
                <span key={color} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
            <p className="mt-2 text-sm font-medium">{option.name}</p>
          </button>
        );
      })}
    </div>
  );
}

export default ThemePicker;
