import { useCallback, useEffect, useState } from 'react';
import { fetchWeather } from '../lib/weather';
import type { WeatherData } from '../lib/weather';

export type WeatherStatus = 'loading' | 'success' | 'denied' | 'error';

// Both the mount effect and the retry callback need to kick off the same
// geolocation → fetch chain, but only retry needs to reset status to
// 'loading' first (the mount effect starts from that state already, via
// useState's initial value) — sharing this avoids a duplicate synchronous
// setState-in-effect on first load.
function requestLocationAndWeather(
  onSuccess: (data: WeatherData) => void,
  onFailure: (status: 'denied' | 'error') => void,
) {
  if (!('geolocation' in navigator)) {
    onFailure('error');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const data = await fetchWeather(position.coords.latitude, position.coords.longitude);
      if (data) onSuccess(data);
      else onFailure('error');
    },
    (geoError) => {
      onFailure(geoError.code === geoError.PERMISSION_DENIED ? 'denied' : 'error');
    },
    { timeout: 10000, maximumAge: 10 * 60 * 1000 },
  );
}

export function useWeather() {
  const [status, setStatus] = useState<WeatherStatus>('loading');
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    requestLocationAndWeather(
      (data) => {
        setWeather(data);
        setStatus('success');
      },
      (failureStatus) => setStatus(failureStatus),
    );
  }, []);

  const retry = useCallback(() => {
    setStatus('loading');
    requestLocationAndWeather(
      (data) => {
        setWeather(data);
        setStatus('success');
      },
      (failureStatus) => setStatus(failureStatus),
    );
  }, []);

  return { weather, status, retry };
}
