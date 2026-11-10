export type AnalyticsData = import("@/lib/contracts").AnalyticsDto;
export type CategoryBreakdown = AnalyticsData["categoryBreakdown"][number];
export type AnalyticsTransaction = CategoryBreakdown["transactions"][number];
