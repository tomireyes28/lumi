import type { Reminder } from "./reminders";

export type { Reminder };

export type DashboardSummary = import("@/lib/contracts").DashboardSummaryDto;

export type SummaryData = DashboardSummary;

export type CardRecommendation =
  import("@/lib/contracts").CardRecommendationDto;
