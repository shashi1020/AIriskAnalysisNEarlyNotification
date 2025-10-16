// /pages/api/weather-alerts.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWeather, checkWeatherThresholds } from "@/lib/weatherAPI";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { city } = req.query;
  if (!city) return res.status(400).json({ error: "City required" });

  try {
    const weather = await fetchWeather(city as string);
    const alerts = checkWeatherThresholds(weather);
    res.status(200).json({ weather, alerts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
