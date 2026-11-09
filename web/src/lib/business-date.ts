export const BUSINESS_TIMEZONE = "America/Argentina/Buenos_Aires";
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function businessDateKey(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
/** Date widgets use local Date objects to represent a selected calendar label. */
export function calendarWidgetToday(): Date {
  const [y, m, d] = businessDateKey(new Date()).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
/** Compatibility for legacy date-only fields formerly serialized at UTC midnight. */
export function storedCalendarKey(value: string): string {
  return /T00:00:00(?:\.000)?Z$/.test(value)
    ? value.slice(0, 10)
    : businessDateKey(value);
}
