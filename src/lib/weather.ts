export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy';

export interface DayForecast {
  date: string;
  precipitationProbabilityMax: number;
}

export interface WeatherData {
  temperatureC: number;
  condition: WeatherCondition;
  uvIndex: number | null;
  precipitationProbability: number | null;
  // forecast[0] is today (Open-Meteo's `daily` array starts from today under
  // timezone=auto), forecast[1] is tomorrow, etc. — up to 7 entries.
  forecast: DayForecast[];
}

export const WEATHER_CONDITION_META: Record<WeatherCondition, { label: string; emoji: string }> = {
  sunny: { label: 'Sunny', emoji: '☀️' },
  cloudy: { label: 'Cloudy', emoji: '☁️' },
  rainy: { label: 'Rainy', emoji: '🌧️' },
  snowy: { label: 'Snowy', emoji: '❄️' },
  stormy: { label: 'Stormy', emoji: '⛈️' },
};

// WMO weather codes: https://open-meteo.com/en/docs — every code not
// explicitly sunny/cloudy/snowy/stormy is some form of drizzle/rain/showers.
export function conditionForWeatherCode(code: number): WeatherCondition {
  if (code === 0) return 'sunny';
  if (code === 1 || code === 2 || code === 3 || code === 45 || code === 48) return 'cloudy';
  if (code >= 95) return 'stormy';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snowy';
  return 'rainy';
}

export function uvIndexLevel(uv: number): { label: string; className: string } {
  if (uv < 3) {
    return { label: 'Low', className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300' };
  }
  if (uv < 6) {
    return { label: 'Moderate', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' };
  }
  if (uv < 8) {
    return { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' };
  }
  if (uv < 11) {
    return { label: 'Very High', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' };
  }
  return { label: 'Extreme', className: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' };
}

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

function dateOf(isoString: string): string {
  return isoString.slice(0, 10);
}

export async function fetchWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  try {
    const url =
      `${BASE_URL}?latitude=${latitude}&longitude=${longitude}&current_weather=true` +
      `&hourly=precipitation_probability,uv_index` +
      `&daily=precipitation_probability_max&forecast_days=7&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const current = json?.current_weather;
    if (!current || typeof current.temperature !== 'number') return null;

    const today = dateOf(current.time);
    const hourlyTimes: string[] = json?.hourly?.time ?? [];
    const precipProbabilities: number[] = json?.hourly?.precipitation_probability ?? [];
    const uvIndices: number[] = json?.hourly?.uv_index ?? [];

    // "Today's" rain probability / UV index means the day's peak, not just the
    // current hour (which would read 0 for UV at night, understating the day).
    let maxPrecipitationProbability: number | null = null;
    let maxUvIndex: number | null = null;
    hourlyTimes.forEach((time, i) => {
      if (dateOf(time) !== today) return;
      if (typeof precipProbabilities[i] === 'number') {
        maxPrecipitationProbability = Math.max(maxPrecipitationProbability ?? 0, precipProbabilities[i]);
      }
      if (typeof uvIndices[i] === 'number') {
        maxUvIndex = Math.max(maxUvIndex ?? 0, uvIndices[i]);
      }
    });

    const dailyDates: string[] = json?.daily?.time ?? [];
    const dailyPrecipMax: number[] = json?.daily?.precipitation_probability_max ?? [];
    const forecast: DayForecast[] = dailyDates.map((date, i) => ({
      date,
      precipitationProbabilityMax: typeof dailyPrecipMax[i] === 'number' ? dailyPrecipMax[i] : 0,
    }));

    return {
      temperatureC: current.temperature,
      condition: conditionForWeatherCode(current.weathercode),
      uvIndex: maxUvIndex,
      precipitationProbability: maxPrecipitationProbability,
      forecast,
    };
  } catch {
    return null;
  }
}

export type WateringAdvice = 'skip_tomorrow' | 'water_today' | 'normal';

export const WATERING_ADVICE_META: Record<WateringAdvice, { text: string; className: string }> = {
  skip_tomorrow: {
    text: '💧 Skip watering tomorrow — rain expected',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  water_today: {
    text: '☀️ Water today — no rain forecast this week',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  normal: {
    text: 'Normal watering schedule',
    className: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  },
};

export function getWateringAdvice(forecast: DayForecast[]): WateringAdvice {
  if (forecast.length === 0) return 'normal';

  const tomorrow = forecast[1];
  if (tomorrow && tomorrow.precipitationProbabilityMax > 60) return 'skip_tomorrow';

  const lowRainDays = forecast.filter((day) => day.precipitationProbabilityMax < 20).length;
  if (lowRainDays >= 5) return 'water_today';

  return 'normal';
}
