export interface NeatocalColorCell {
  date: string;
  color: string;
}

export type NeatocalLayout = 'default' | 'aligned-weekdays';

export interface NeatocalOptions {
  year: number;
  layout?: NeatocalLayout;
  startDay?: number;
  weekendDays?: number[];
  highlightColor?: string;
  todayHighlightColor?: string;
  colorCell?: NeatocalColorCell[];
  data?: Record<string, string | string[]>;
  monthCode?: string[];
  weekdayCode?: string[];
  cellHeight?: string;
}

const DEFAULT_MONTH_CODE = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DEFAULT_WEEKDAY_CODE = ['Su', 'M', 'T', 'W', 'R', 'F', 'Sa'];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function formatDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
}

function makeSpan(text: string, className: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = text;
  span.className = className;
  return span;
}

function renderCellData(
  td: HTMLTableCellElement,
  dateKey: string,
  options: Required<Pick<NeatocalOptions, 'data'>>,
): void {
  const value = options.data[dateKey];

  if (value === undefined) {
    return;
  }

  const lines = Array.isArray(value) ? value : [value];

  for (const line of lines) {
    const div = document.createElement('div');
    div.className = 'cell-data';
    div.textContent = line;
    td.appendChild(div);
  }
}

function normalize(options: NeatocalOptions) {
  return {
    year: options.year,
    layout: options.layout ?? 'aligned-weekdays',
    startDay: options.startDay ?? 1,
    weekendDays: options.weekendDays ?? [0, 6],
    highlightColor: options.highlightColor ?? '#eeeeee',
    todayHighlightColor: options.todayHighlightColor ?? '#bbdefb',
    colorCell: options.colorCell ?? [],
    data: options.data ?? {},
    monthCode: options.monthCode ?? DEFAULT_MONTH_CODE,
    weekdayCode: options.weekdayCode ?? DEFAULT_WEEKDAY_CODE,
    cellHeight: options.cellHeight ?? '',
  };
}

function renderHeader(options: ReturnType<typeof normalize>): HTMLTableSectionElement {
  const thead = document.createElement('thead');
  const row = document.createElement('tr');

  for (const month of options.monthCode) {
    const th = document.createElement('th');
    th.textContent = month;
    th.className = 'month-name';
    row.appendChild(th);
  }

  thead.appendChild(row);
  return thead;
}

function renderAlignedRow(
  options: ReturnType<typeof normalize>,
  dayStarts: number[],
  rowIndex: number,
): HTMLTableRowElement {
  const row = document.createElement('tr');

  if (options.cellHeight) {
    row.style.height = options.cellHeight;
  }

  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(options.year, month + 1, 0).getDate();
    const dayIndex = rowIndex - ((dayStarts[month] - options.startDay + 7) % 7);
    const cell = document.createElement('td');

    if (dayIndex >= 0 && dayIndex < daysInMonth) {
      const weekday = new Date(options.year, month, dayIndex + 1).getDay();
      const dateKey = formatDate(options.year, month, dayIndex + 1);

      if (options.weekendDays.includes(weekday)) {
        cell.classList.add('weekend');
      }

      cell.dataset.date = dateKey;
      cell.appendChild(makeSpan(String(dayIndex + 1), 'date'));
      cell.appendChild(makeSpan(options.weekdayCode[weekday], 'day'));
      renderCellData(cell, dateKey, options);
    }

    row.appendChild(cell);
  }

  return row;
}

function renderDefaultRow(
  options: ReturnType<typeof normalize>,
  dayIndex: number,
): HTMLTableRowElement {
  const row = document.createElement('tr');

  if (options.cellHeight) {
    row.style.height = options.cellHeight;
  }

  for (let month = 0; month < 12; month += 1) {
    const daysInMonth = new Date(options.year, month + 1, 0).getDate();
    const cell = document.createElement('td');

    if (dayIndex < daysInMonth) {
      const weekday = new Date(options.year, month, dayIndex + 1).getDay();
      const dateKey = formatDate(options.year, month, dayIndex + 1);

      if (options.weekendDays.includes(weekday)) {
        cell.classList.add('weekend');
      }

      cell.dataset.date = dateKey;
      cell.appendChild(makeSpan(String(dayIndex + 1), 'date'));
      renderCellData(cell, dateKey, options);
    }

    row.appendChild(cell);
  }

  return row;
}

function applyPostProcess(container: HTMLElement, options: ReturnType<typeof normalize>): void {
  for (const weekend of container.querySelectorAll<HTMLElement>('.weekend')) {
    weekend.style.background = options.highlightColor;
  }

  const today = new Date();
  const todayKey = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
  const todayCell = container.querySelector<HTMLElement>(`[data-date="${todayKey}"]`);

  if (todayCell) {
    todayCell.style.background = options.todayHighlightColor;
  }

  for (const colorCell of options.colorCell) {
    const cell = container.querySelector<HTMLElement>(`[data-date="${colorCell.date}"]`);

    if (cell) {
      cell.style.background = colorCell.color;
    }
  }
}

export function renderYear(container: HTMLElement, rawOptions: NeatocalOptions): void {
  const options = normalize(rawOptions);
  container.innerHTML = '';

  const table = document.createElement('table');
  table.className = 'neatocal';
  table.appendChild(renderHeader(options));

  const tbody = document.createElement('tbody');

  if (options.layout === 'aligned-weekdays') {
    const dayStarts = Array.from({ length: 12 }, (_, month) => new Date(options.year, month, 1).getDay());

    for (let rowIndex = 0; rowIndex < 42; rowIndex += 1) {
      tbody.appendChild(renderAlignedRow(options, dayStarts, rowIndex));
    }
  } else {
    for (let dayIndex = 0; dayIndex < 31; dayIndex += 1) {
      tbody.appendChild(renderDefaultRow(options, dayIndex));
    }
  }

  table.appendChild(tbody);
  container.appendChild(table);
  applyPostProcess(container, options);
}
