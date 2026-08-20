import { MapPin } from 'lucide-react';
import { WEATHER_CONDITION_META, WATERING_ADVICE_META, getWateringAdvice, uvIndexLevel } from '../../lib/weather';
import type { WeatherData } from '../../lib/weather';
import type { WeatherStatus } from '../../hooks/useWeather';

interface WeatherWidgetProps {
  weather: WeatherData | null;
  status: WeatherStatus;
  onRetry: () => void;
}

function WeatherWidget({ weather, status, onRetry }: WeatherWidgetProps) {
  if (status === 'loading') {
    return (
      <div className="animate-pulse rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="h-14 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-3 h-3 w-1/2 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    );
  }

  if (status === 'denied' || status === 'error' || !weather) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-neutral-300 p-4 text-sm dark:border-neutral-700">
        <div className="flex items-center gap-2 text-neutral-500">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{status === 'denied' ? 'Enable location for weather' : 'Weather unavailable right now'}</span>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium text-green-700 dark:text-green-400"
        >
          Try again
        </button>
      </div>
    );
  }

  const condition = WEATHER_CONDITION_META[weather.condition];
  const wateringAdvice = WATERING_ADVICE_META[getWateringAdvice(weather.forecast)];

  return (
    <div className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">
            {condition.emoji}
          </span>
          <div>
            <p className="text-2xl font-semibold">{Math.round(weather.temperatureC)}°C</p>
            <p className="text-sm text-neutral-500">{condition.label}</p>
          </div>
        </div>
        {weather.uvIndex !== null && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${uvIndexLevel(weather.uvIndex).className}`}
          >
            UV {Math.round(weather.uvIndex)} · {uvIndexLevel(weather.uvIndex).label}
          </span>
        )}
      </div>
      {weather.precipitationProbability !== null && (
        <p className="mt-2 text-sm text-neutral-500">
          {Math.round(weather.precipitationProbability)}% chance of rain today
        </p>
      )}
      <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${wateringAdvice.className}`}>
        {wateringAdvice.text}
      </span>
    </div>
  );
}

export default WeatherWidget;
