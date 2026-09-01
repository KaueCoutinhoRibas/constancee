export function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseYYYYMMDD(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getDayOfWeekFromYYYYMMDD(dateStr: string): number {
  const date = parseYYYYMMDD(dateStr);
  return date.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
}

export function addDays(dateStr: string, days: number): string {
  const date = parseYYYYMMDD(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateToYYYYMMDD(date);
}

export function subtractDays(dateStr: string, days: number): string {
  const date = parseYYYYMMDD(dateStr);
  date.setDate(date.getDate() - days);
  return formatDateToYYYYMMDD(date);
}

export function isSameDay(dateStr1: string, dateStr2: string): boolean {
  return dateStr1 === dateStr2;
}