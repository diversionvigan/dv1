/**
 * Timezone-Safe Date Utility Helpers
 * Prevents UTC timezone drift when converting Date objects to YYYY-MM-DD strings.
 */

export function formatLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getNextDayStr(dateStr: string, daysToAdd: number = 1): string {
  if (!dateStr) return formatLocalDate();
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextDate = new Date(y, m - 1, d + daysToAdd);
  return formatLocalDate(nextDate);
}

export function getLocalDateToday(): string {
  return formatLocalDate(new Date());
}

export function getLocalDateTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}
