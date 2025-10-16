// /lib/weatherAPI.ts
export const WEATHER_THRESHOLDS = {
  temperature: 40,  // °C
  wind_speed: 50,   // km/h
  rain: 20          // mm/h
};

export async function fetchWeather(city: string) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=02899ff403d5c49569ac0b9864c13a2d`
  );
  if (!res.ok) throw new Error("Failed to fetch weather");
  return await res.json();
}

export function checkWeatherThresholds(data: any) {
  const alerts: string[] = [];
  if (data.main.temp > WEATHER_THRESHOLDS.temperature)
    alerts.push(`High Temp Alert: ${data.main.temp}°C`);
  if (data.wind.speed > WEATHER_THRESHOLDS.wind_speed)
    alerts.push(`High Wind Alert: ${data.wind.speed} km/h`);
  if (data.rain?.['1h'] > WEATHER_THRESHOLDS.rain)
    alerts.push(`Heavy Rain Alert: ${data.rain['1h']} mm/h`);
  return alerts;
}
