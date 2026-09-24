import type {OrgWeather} from "@/lib/weather";

export default function HomeWeather({weather}:{weather:OrgWeather|null}){
 return <section className="tenant-panel phase2-weather">
  <div className="phase2-widget-head"><div><h2>Local weather</h2><p>{weather?weather.locationLabel:"Business location"}</p></div>{weather&&<strong>{weather.temperature}°</strong>}</div>
  {!weather?<div className="phase2-widget-empty">Add a city, state, or ZIP in Settings to see local conditions.</div>:<>
   <div className="phase2-weather-now"><div><b>{weather.condition}</b><span>{weather.humidity!==null?`Humidity ${weather.humidity}% · `:""}Wind {weather.windSpeed} mph</span></div></div>
   {weather.forecast.length>0&&<div className="phase2-weather-days">{weather.forecast.map(day=><div key={day.date}><b>{day.label}</b><span>{day.high}° / {day.low}°</span><small>{day.precipitation}% precip</small></div>)}</div>}
  </>}
 </section>;
}
