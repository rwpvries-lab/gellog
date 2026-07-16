import { PeakTimesCard } from "../PeakTimesCard";
import type { DashboardData } from "./types";

export function PeakTimesWidget({ data }: { data: DashboardData }) {
  if (!data.peakGrid) return null;
  return <PeakTimesCard peak={data.peakGrid} />;
}
