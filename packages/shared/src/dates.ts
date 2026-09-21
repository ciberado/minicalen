export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function mondayFirstOffset(year: number, monthIndex: number): number {
  return (new Date(year, monthIndex, 1).getDay() + 6) % 7;
}

export interface MonthCell {
  dateKey: string;
  day: number;
  monthOffset: -1 | 0 | 1;
}

export function monthGrid(year: number, monthIndex: number): MonthCell[] {
  const offset = mondayFirstOffset(year, monthIndex);
  const total = daysInMonth(year, monthIndex);
  const previousMonthDays = daysInMonth(
    monthIndex === 0 ? year - 1 : year,
    (monthIndex + 11) % 12,
  );
  const cells: MonthCell[] = [];

  for (let index = offset; index > 0; index -= 1) {
    const day = previousMonthDays - index + 1;
    cells.push({
      dateKey: dateKeyFromParts(year, monthIndex - 1, day),
      day,
      monthOffset: -1,
    });
  }

  for (let day = 1; day <= total; day += 1) {
    cells.push({ dateKey: dateKeyFromParts(year, monthIndex, day), day, monthOffset: 0 });
  }

  let nextDay = 1;

  while (cells.length % 7 !== 0) {
    cells.push({
      dateKey: dateKeyFromParts(year, monthIndex + 1, nextDay),
      day: nextDay,
      monthOffset: 1,
    });
    nextDay += 1;
  }

  return cells;
}

export function monthCells(year: number, monthIndex: number): Array<number | null> {
  return monthGrid(year, monthIndex).map((cell) => (cell.monthOffset === 0 ? cell.day : null));
}

export function dateKeyFromParts(year: number, monthIndex: number, day: number): string {
  return toDateKey(new Date(year, monthIndex, day));
}
