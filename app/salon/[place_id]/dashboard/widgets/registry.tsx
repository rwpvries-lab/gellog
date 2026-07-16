import type { ComponentType } from "react";
import { StatsStripWidget } from "./StatsStripWidget";
import { FlavourBoardWidget } from "./FlavourBoardWidget";
import { WeatherWidget } from "./WeatherWidget";
import { VisitsTrendWidget } from "./VisitsTrendWidget";
import { FlavourPerformanceWidget } from "./FlavourPerformanceWidget";
import { RecentLogsWidget } from "./RecentLogsWidget";
import { PeakTimesWidget } from "./PeakTimesWidget";
import { VisitorRecurrenceWidget } from "./VisitorRecurrenceWidget";
import { DowHeatmapWidget } from "./DowHeatmapWidget";
import { RatingHistogramWidget } from "./RatingHistogramWidget";
import { VitrineConversionWidget } from "./VitrineConversionWidget";
import { FlavourInsightsWidget } from "./FlavourInsightsWidget";
import { CsvExportWidget } from "./CsvExportWidget";
import { LogCleanupHistoryWidget } from "./LogCleanupHistoryWidget";
import type { DashboardData, WidgetId } from "./types";

export const WIDGET_COMPONENTS: Record<WidgetId, ComponentType<{ data: DashboardData }>> = {
  stats_strip: StatsStripWidget,
  flavour_board: FlavourBoardWidget,
  weather: WeatherWidget,
  visits_trend: VisitsTrendWidget,
  flavour_performance: FlavourPerformanceWidget,
  recent_logs: RecentLogsWidget,
  peak_times: PeakTimesWidget,
  visitor_recurrence: VisitorRecurrenceWidget,
  dow_distribution: DowHeatmapWidget,
  rating_histogram: RatingHistogramWidget,
  vitrine_conversion: VitrineConversionWidget,
  flavour_insights: FlavourInsightsWidget,
  csv_export: CsvExportWidget,
  log_cleanup_history: LogCleanupHistoryWidget,
};
