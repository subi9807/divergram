// Provider credentials stay on the server. Reads only; never submits messages or payments.
export function registerMarineWeatherRoutes(app, { getAuthUserId, authRateLimit, fetchImpl = fetch }) {
  const cache = new Map();
  const pending = new Map();
  let activeKey = '';
  app.get('/api/marine-weather', authRateLimit(30, 60_000), async (req, res) => {
    if (!getAuthUserId(req)) return res.status(401).json({ error: 'unauthorized' });
    const { lat: rawLat, lng: rawLng } = req.query;
    const lat = Number(rawLat), lng = Number(rawLng);
    if (typeof rawLat !== 'string' || !rawLat.trim() || typeof rawLng !== 'string' || !rawLng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return res.status(400).json({ error: 'invalid_coordinates' });
    const key = String(process.env.STORMGLASS_API_KEY || '').trim();
    if (key !== activeKey) { cache.clear(); pending.clear(); activeKey = key; }
    if (!key) return res.status(503).json({ error: 'marine_weather_not_configured' });
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const stored = cache.get(cacheKey);
    if (stored && stored.until > Date.now()) return res.json({ data: stored.data, cached: true });
    if (!pending.has(cacheKey) && pending.size >= 10) return res.status(429).json({ error: 'marine_weather_busy' });
    if (!pending.has(cacheKey)) {
      const request = (async () => {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng), params: 'waveHeight,currentSpeed,currentDirection,waterTemperature,windSpeed,airTemperature', source: 'sg,noaa' });
        const options = () => ({ headers: { Authorization: key }, signal: AbortSignal.timeout(8000), redirect: 'error' });
        const weatherResponse = await fetchImpl(`https://api.stormglass.io/v2/weather/point?${params}`, options());
        if (!weatherResponse.ok) throw new Error('provider_unavailable');
        const weather = await weatherResponse.json();
        if (!Array.isArray(weather.hours) || !weather.hours.length) throw new Error('provider_empty');
        const tideResponse = await fetchImpl(`https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lng}`, options()).catch(() => null);
        const tides = tideResponse?.ok ? await tideResponse.json().catch(() => ({ data: [] })) : { data: [] };
        const data = { weather: { hours: weather.hours }, tides: { data: Array.isArray(tides.data) ? tides.data : [] }, fetchedAt: new Date().toISOString() };
        if (activeKey === key) {
          if (cache.size >= 256) cache.delete(cache.keys().next().value);
          cache.set(cacheKey, { data, until: Date.now() + 30 * 60_000 });
        }
        return data;
      })();
      pending.set(cacheKey, request);
      void request.finally(() => { if (pending.get(cacheKey) === request) pending.delete(cacheKey); }).catch(() => undefined);
    }
    try { return res.json({ data: await pending.get(cacheKey), cached: false }); }
    catch { return res.status(502).json({ error: 'marine_weather_unavailable' }); }
  });
}
