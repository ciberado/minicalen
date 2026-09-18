import { LitElement, css, html, type TemplateResult } from 'lit';
import { property } from 'lit/decorators.js';
import {
  MONTH_NAMES,
  WEEKDAY_NAMES,
  dateKeyFromParts,
  generateSymbol,
  monthCells,
  toDateKey,
  type Category,
  type DateMarkMap,
} from '@minicalen/shared';
import { hexToRgba } from './color';

export interface DateClickDetail {
  date: string;
}

export class YearGrid extends LitElement {
  @property({ type: Number }) year = new Date().getFullYear();
  @property({ attribute: false }) categories: Category[] = [];
  @property({ attribute: false }) dateMarks: DateMarkMap = {};
  @property({ type: Boolean }) readOnly = false;
  @property({ type: String }) selectedCategoryId: string | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
    }

    .months {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
    }

    @media (max-width: 1100px) {
      .months {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 820px) {
      .months {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .month {
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      padding: 8px;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .month-name {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 6px;
      color: #333;
    }

    .weekdays,
    .days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
    }

    .weekday {
      text-align: center;
      font-size: 10px;
      color: #999;
      padding-bottom: 2px;
    }

    .day {
      position: relative;
      min-height: 26px;
      border-radius: 4px;
      font-size: 11px;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 2px 3px;
      box-sizing: border-box;
      cursor: pointer;
      color: #333;
    }

    .day.blank {
      cursor: default;
      background: transparent;
    }

    .day:not(.blank):hover {
      outline: 1px solid #90caf9;
    }

    .day.today {
      outline: 2px solid #1976d2;
    }

    .day .number {
      position: relative;
      z-index: 2;
    }

    .symbols {
      position: absolute;
      top: 12px;
      left: 2px;
      display: flex;
      flex-wrap: wrap;
      gap: 1px;
      z-index: 2;
      pointer-events: none;
    }

    .symbol {
      font-size: 9px;
      font-weight: 700;
      line-height: 1;
      padding: 0 2px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.85);
    }
  `;

  private categoryById(id: string | undefined): Category | undefined {
    return id ? this.categories.find((category) => category.id === id) : undefined;
  }

  private dayBackground(dateKey: string): string {
    const mark = this.dateMarks[dateKey];
    const category = this.categoryById(mark?.categoryId);

    if (!category) {
      return '';
    }

    return category.visible === false ? hexToRgba(category.color, 0.18) : category.color;
  }

  private renderSymbols(dateKey: string): TemplateResult {
    const mark = this.dateMarks[dateKey];
    const ids = mark?.textCategoryIds ?? [];

    if (ids.length === 0) {
      return html``;
    }

    return html`<span class="symbols">
      ${ids.map((id) => {
        const category = this.categoryById(id);

        if (!category) {
          return '';
        }

        return html`<span
          class="symbol"
          style="color:${category.color};opacity:${category.visible === false ? 0.1 : 1}"
          >${generateSymbol(category.label)}</span
        >`;
      })}
    </span>`;
  }

  private handleDayClick(date: string, category: Category | undefined): void {
    if (this.readOnly || !category || category.active === false) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<DateClickDetail>('date-click', {
        detail: { date },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderMonth(monthIndex: number, todayKey: string): TemplateResult {
    const selected = this.categoryById(this.selectedCategoryId ?? undefined);

    return html`
      <section class="month">
        <div class="month-name">${MONTH_NAMES[monthIndex]}</div>
        <div class="weekdays">
          ${WEEKDAY_NAMES.map((weekday) => html`<div class="weekday">${weekday.charAt(0)}</div>`)}
        </div>
        <div class="days">
          ${monthCells(this.year, monthIndex).map((day) => {
            if (day === null) {
              return html`<div class="day blank"></div>`;
            }

            const dateKey = dateKeyFromParts(this.year, monthIndex, day);
            const background = this.dayBackground(dateKey);

            return html`<div
              class="day${dateKey === todayKey ? ' today' : ''}"
              data-date=${dateKey}
              style=${background ? `background:${background}` : ''}
              @click=${() => this.handleDayClick(dateKey, selected)}
            >
              <span class="number">${day}</span>
              ${this.renderSymbols(dateKey)}
            </div>`;
          })}
        </div>
      </section>
    `;
  }

  render(): TemplateResult {
    const todayKey = toDateKey(new Date());

    return html`<div class="months">
      ${MONTH_NAMES.map((_, monthIndex) => this.renderMonth(monthIndex, todayKey))}
    </div>`;
  }
}

if (!customElements.get('year-grid')) {
  customElements.define('year-grid', YearGrid);
}
