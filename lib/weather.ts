type ForecastDay = {
  date: string;
  label: string;
  condition: string;
  high: number;
  low: number;
  precipitation: number;
};

export type OrgWeather = {
  locationLabel: string;
  temperature: number;
  condition: string;
  humidity: number | null;
  windSpeed: number;
  forecast: ForecastDay[];
};

function describeCode(code: number): string {
  if (code === 0) return "Clear";
  if (code === 1 || code === 2) return "Mostly Clear";
  if (code === 3) return "Cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain Showers";
  if (code >= 85 && code <= 86) return "Snow Showers";
  if (code >= 95) return "Thunderstorm";
  return "Cloudy";
}

// Looks up current + 5-day weather for a tenant's own business location
// (city/state/zip from their Organization record). Uses the free Open-Meteo
// APIs (no API key required). Returns null if the org has no usable
// location set, or if the lookup fails for any reason.
export async function getOrganizationWeather(org: {
  city: string | null;
  state: string | null;
  zip: string | null;
  address: string | null;
}): Promise<OrgWeather | null> {
  const query =
    org.city && org.state
      ? org.city + ", " + org.state
      : org.zip
      ? org.zip
      : org.city || org.address || null;

  if (!query) return null;

  try {
    const geoRes = await fetch(
      "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(query)
    );
    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const place = geoData.results && geoData.results[0];
    if (!place) return null;

    const forecastUrl =
      "https://api.open-meteo.com/v1/forecast?latitude=" +
      place.latitude +
      "&longitude=" +
      place.longitude +
      "&current_weather=true" +
      "&hourly=relativehumidity_2m" +
      "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto";

    const forecastRes = await fetch(forecastUrl);
    if (!forecastRes.ok) return null;
    const forecastData = await forecastRes.json();
    const current = forecastData.current_weather;
    if (!current) return null;

    let humidity: number | null = null;
    if (forecastData.hourly && Array.isArray(forecastData.hourly.time)) {
      const idx = forecastData.hourly.time.indexOf(current.time);
      if (idx >= 0) humidity = forecastData.hourly.relativehumidity_2m[idx];
    }

    const forecast: ForecastDay[] = [];
    const daily = forecastData.daily;
    if (daily && Array.isArray(daily.time)) {
      for (let i = 0; i < daily.time.length && i < 5; i++) {
        const d = new Date(daily.time[i] + "T00:00:00");
        forecast.push({
          date: daily.time[i],
          label: d.toLocaleDateString("en-US", { weekday: "short" }),
          condition: describeCode(daily.weathercode[i]),
          high: Math.round(daily.temperature_2m_max[i]),
          low: Math.round(daily.temperature_2m_min[i]),
          precipitation: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : 0,
        });
      }
    }

    return {
      locationLabel: place.name + (place.admin1 ? ", " + place.admin1 : ""),
      temperature: Math.round(current.temperature),
      condition: describeCode(current.weathercode),
      humidity,
      windSpeed: Math.round(current.windspeed),
      forecast,
    };
  } catch {
    return null;
  }
}
