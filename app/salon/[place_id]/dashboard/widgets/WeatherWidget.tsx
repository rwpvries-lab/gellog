import { SalonDashboardWeatherCard } from "../SalonDashboardWeatherCard";
import type { DashboardData } from "./types";

export function WeatherWidget({ data }: { data: DashboardData }) {
  return (
    <SalonDashboardWeatherCard
      weather={data.dashboardWeather}
      hasCoordinates={data.salonHasCoordinates}
    />
  );
}
