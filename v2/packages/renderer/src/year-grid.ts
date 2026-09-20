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
import { INK_DARK, contrastInk, hexToRgba } from './color';

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
      font-family: var(--zen-font, ui-sans-serif, system-ui, sans-serif);
      color: var(--zen-ink, #2e3833);
      --cell: clamp(30px, 3.6vh, 52px);
    }

    .months {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
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
      border: 1px solid var(--zen-line, #e4e2d9);
      border-radius: var(--zen-radius, 16px);
      padding: 12px 13px 13px;
      background: var(--zen-surface, #fff);
      box-shadow: var(--zen-shadow-sm, 0 1px 2px rgba(46, 56, 51, 0.05));
      transition: box-shadow 160ms cubic-bezier(0.22, 0.61, 0.36, 1),
        transform 160ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    .month:hover {
      box-shadow: var(--zen-shadow, 0 10px 30px -18px rgba(46, 56, 51, 0.35));
      transform: translateY(-1px);
    }

    .month-name {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 8px;
      color: var(--zen-ink-soft, #66736d);
    }

    .weekdays,
    .days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 3px;
    }

    .weekday {
      text-align: center;
      font-size: 9px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--zen-ink-faint, #98a39d);
      padding-bottom: 3px;
    }

    .day {
      position: relative;
      min-height: var(--cell, 30px);
      border-radius: 8px;
      font-size: 11.5px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 3px 4px;
      box-sizing: border-box;
      cursor: pointer;
      color: var(--zen-ink, #2e3833);
      transition: background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
    }

    .day.blank {
      cursor: default;
      background: transparent;
    }

    .day:not(.blank):hover {
      background: var(--zen-accent-soft, #e6efe9);
      box-shadow: inset 0 0 0 1px var(--zen-accent-ring, rgba(111, 147, 132, 0.35));
    }

    .day.today {
      box-shadow: inset 0 0 0 2px var(--zen-accent, #6f9384);
      color: var(--zen-accent-strong, #557a6b);
      font-weight: 700;
    }

    .day.marked {
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06),
        0 6px 12px -8px rgba(46, 56, 51, 0.5);
      font-weight: 600;
    }

    .day.marked.today {
      box-shadow: inset 0 0 0 2px var(--zen-accent, #6f9384),
        0 6px 12px -8px rgba(46, 56, 51, 0.5);
    }

    .day .number {
      position: relative;
      z-index: 2;
    }

    .symbols {
      display: flex;
      flex-wrap: wrap;
      gap: 2px;
      pointer-events: none;
    }

    .symbol {
      font-size: 9px;
      font-weight: 800;
      line-height: 1;
      padding: 1px 3px;
      border-radius: 5px;
      background: var(--zen-surface, #fff);
      box-shadow: 0 1px 3px rgba(46, 56, 51, 0.18);
    }

    @media print {
      :host {
        --cell: 7.4mm;
        overflow: visible;
      }

      .months {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 3mm;
      }

      .month {
        box-shadow: none;
        border: 0.2mm solid #c8c6bd;
        border-radius: 2mm;
        padding: 1.6mm;
        break-inside: avoid;
      }

      .month:hover {
        box-shadow: none;
        transform: none;
      }

      .month-name {
        font-size: 7pt;
        letter-spacing: 0.08em;
        margin-bottom: 1mm;
      }

      .weekday {
        font-size: 5pt;
        padding-bottom: 0.4mm;
      }

      .weekdays,
      .days {
        gap: 0.4mm;
      }

      .day {
        border-radius: 1mm;
        font-size: 6.5pt;
        gap: 0.3mm;
        padding: 0.4mm 0.6mm;
      }

      .day:not(.blank):hover {
        background: transparent;
        box-shadow: none;
      }

      .day.marked {
        box-shadow: inset 0 0 0 0.15mm rgba(0, 0, 0, 0.15);
      }

      .day.today,
      .day.marked.today {
        box-shadow: inset 0 0 0 0.4mm var(--zen-accent, #6f9384);
      }

      .symbol {
        font-size: 5pt;
        padding: 0 0.4mm;
        border-radius: 0.6mm;
        box-shadow: none;
      }
    }
  `;

  private categoryById(id: string | undefined): Category | undefined {
    return id ? this.categories.find((category) => category.id === id) : undefined;
  }

  private foregroundCategories(dateKey: string): Category[] {
    const mark = this.dateMarks[dateKey];
    const ids = mark?.categoryIds ?? [];

    return ids
      .map((id) => this.categoryById(id))
      .filter((category): category is Category => Boolean(category))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  private fillFor(category: Category): string {
    return category.visible === false ? hexToRgba(category.color, 0.18) : category.color;
  }

  private inkFor(category: Category): string {
    return category.visible === false ? INK_DARK : contrastInk(category.color);
  }

  private dayStyle(dateKey: string): { background: string; ink: string } | null {
    const categories = this.foregroundCategories(dateKey);

    if (categories.length === 0) {
      return null;
    }

    if (categories.length === 1) {
      return {
        background: this.fillFor(categories[0]),
        ink: this.inkFor(categories[0]),
      };
    }

    const [primary, secondary] = categories;

    return {
      background: `linear-gradient(to bottom right, ${this.fillFor(primary)} 0 50%, ${this.fillFor(secondary)} 50% 100%)`,
      ink: this.inkFor(primary),
    };
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
            const style = this.dayStyle(dateKey);
            const classes = [
              'day',
              dateKey === todayKey ? 'today' : '',
              style ? 'marked' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return html`<div
              class=${classes}
              data-date=${dateKey}
              style=${style ? `background:${style.background}` : ''}
              @click=${() => this.handleDayClick(dateKey, selected)}
            >
              <span class="number" style=${style ? `color:${style.ink}` : ''}>${day}</span>
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
