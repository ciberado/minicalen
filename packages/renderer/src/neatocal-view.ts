import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { generateSymbol, type Category, type DateMarkMap } from '@minicalen/shared';
import { INK_DARK, contrastInk, hexToRgba } from './color';
import { renderYear, type NeatocalColorCell, type NeatocalLayout } from './neatocal/renderYear';

export class NeatocalView extends LitElement {
  @property({ type: Number }) year = new Date().getFullYear();
  @property({ attribute: false }) categories: Category[] = [];
  @property({ attribute: false }) dateMarks: DateMarkMap = {};
  @property({ type: String }) layout: NeatocalLayout = 'aligned-weekdays';

  static styles = css`
    :host {
      display: block;
      font-family: var(--zen-font, ui-sans-serif, system-ui, sans-serif);
      color: var(--zen-ink, #2e3833);
      overflow: auto;
    }

    .host {
      display: inline-block;
      min-width: 100%;
      box-sizing: border-box;
      background: var(--zen-surface, #fff);
      border: 1px solid var(--zen-line, #e4e2d9);
      border-radius: var(--zen-radius, 16px);
      padding: 12px 14px 14px;
      box-shadow: var(--zen-shadow-sm, 0 1px 2px rgba(46, 56, 51, 0.05));
    }

    .host table {
      border-collapse: collapse;
      width: 100%;
      font-size: 11.5px;
    }

    .host th {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--zen-ink-soft, #66736d);
      padding: 6px;
      text-align: left;
      border-bottom: 1px solid var(--zen-line-strong, #d6d3c8);
    }

    .host td {
      padding: 2px 6px;
      vertical-align: top;
      border-bottom: 1px solid var(--zen-line, #e4e2d9);
      white-space: nowrap;
    }

    .host tbody tr:hover td {
      background: color-mix(in srgb, var(--zen-accent-soft, #e6efe9) 45%, transparent);
    }

    .host .date {
      font-weight: 600;
      color: var(--zen-ink, #2e3833);
    }

    .host .day {
      color: var(--zen-ink-faint, #98a39d);
      font-size: 9px;
      margin-left: 3px;
    }

    .host .cell-data {
      font-size: 9px;
      font-weight: 700;
      color: var(--zen-ink, #2e3833);
    }

    @media print {
      :host {
        overflow: visible;
      }

      .host {
        border: none;
        border-radius: 0;
        box-shadow: none;
        padding: 0;
      }

      .host table {
        font-size: 6pt;
      }

      .host th {
        font-size: 5.5pt;
        padding: 1mm 1.5mm;
      }

      .host td {
        padding: 0.35mm 1.5mm;
      }

      .host tbody tr:hover td {
        background: transparent;
      }

      .host .day {
        font-size: 5pt;
      }

      .host .cell-data {
        font-size: 5pt;
      }
    }
  `;

  private categoryById(id: string | undefined): Category | undefined {
    return id ? this.categories.find((category) => category.id === id) : undefined;
  }

  private foregroundCategories(mark: { categoryIds?: string[] }): Category[] {
    return (mark.categoryIds ?? [])
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

  private colorCells(): NeatocalColorCell[] {
    const cells: NeatocalColorCell[] = [];

    for (const [date, mark] of Object.entries(this.dateMarks)) {
      const categories = this.foregroundCategories(mark);

      if (categories.length === 0) {
        continue;
      }

      if (categories.length === 1) {
        cells.push({ date, color: this.fillFor(categories[0]), ink: this.inkFor(categories[0]) });
        continue;
      }

      const [primary, secondary] = categories;

      cells.push({
        date,
        color: `linear-gradient(to bottom right, ${this.fillFor(primary)} 0 50%, ${this.fillFor(secondary)} 50% 100%)`,
        ink: this.inkFor(primary),
      });
    }

    return cells;
  }

  private cellData(): Record<string, string> {
    const data: Record<string, string> = {};

    for (const [date, mark] of Object.entries(this.dateMarks)) {
      const ids = mark.textCategoryIds ?? [];

      if (ids.length === 0) {
        continue;
      }

      const symbols = ids
        .map((id) => this.categoryById(id))
        .filter((category): category is Category => Boolean(category))
        .map((category) => generateSymbol(category.label));

      if (symbols.length > 0) {
        data[date] = symbols.join(' ');
      }
    }

    return data;
  }

  protected override updated(): void {
    const host = this.renderRoot.querySelector<HTMLElement>('.host');

    if (!host) {
      return;
    }

    renderYear(host, {
      year: this.year,
      layout: this.layout,
      highlightColor: 'var(--zen-surface-2, #f1f0ea)',
      todayHighlightColor: 'var(--zen-accent-soft, #e6efe9)',
      colorCell: this.colorCells(),
      data: this.cellData(),
    });
  }

  render() {
    return html`<div class="host"></div>`;
  }
}

if (!customElements.get('neatocal-view')) {
  customElements.define('neatocal-view', NeatocalView);
}
