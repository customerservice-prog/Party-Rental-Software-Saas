import type { OrgWeather } from "@/lib/weather";

export default function HomeWeather({ weather }: { weather: OrgWeather | null }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {!weather ? (
        <>
          <h2 className="font-semibold text-gray-900 mb-1">Weather</h2>
          <p className="text-sm text-gray-400">
            Add a city, state, or zip in your business settings to see local weather here.
          </p>
        </>
      ) : (
        <>
          <h2 className="font-semibold text-gray-900 mb-1">Weather — {weather.locationLabel}</h2>
          <p className="text-2xl font-bold text-gray-900">
            {weather.temperature}°F{" "}
            <span className="text-base font-normal text-gray-500">· {weather.condition}</span>
          </p>
          <p className="text-xs text-gray-500 mb-3">
            {weather.humidity !== null ? "Humidity: " + weather.humidity + "% · " : ""}
            Wind: {weather.windSpeed} mph
          </p>
          {weather.forecast.length > 0 && (
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {weather.forecast.map((day) => (
                <div key={day.date} className="border rounded p-2">
                  <div className="font-medium text-gray-700">{day.label}</div>
                  <div className="text-gray-500">{day.condition}</div>
                  <div className="text-gray-900">
                    {day.high}°/{day.low}°
                  </div>
                  <div className="text-blue-600">{day.precipitation}%</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
