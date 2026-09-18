import { LitElement, css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { generateSymbol, type Category, type DateMarkMap } from '@minicalen/shared';
import { hexToRgba } from './color';
import { renderYear, type NeatocalColorCell, type NeatocalLayout } from './neatocal/renderYear';

export class NeatocalView extends LitElement {
  @property({ type: Number }) year = new Date().getFullYear();
  @property({ attribute: false }) categories: Category[] = [];
  @property({ attribute: false }) dateMarks: DateMarkMap = {};
  @property({ type: String }) layout: NeatocalLayout = 'aligned-weekdays';

  static styles = css`
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      overflow: auto;
    }

    .host {
      display: inline-block;
      min-width: 100%;
    }

    .host table {
      border-collapse: collapse;
      width: 100%;
      font-size: 11px;
    }

    .host th {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 4px;
      text-align: left;
      border-bottom: 2px solid #333;
    }

    .host td {
      padding: 1px 4px;
      vertical-align: top;
      border-bottom: 1px solid #eee;
      white-space: nowrap;
    }

    .host .date {
      font-weight: 600;
      margin-right: 3px;
    }

    .host .day {
      color: #999;
      font-size: 9px;
    }

    .host .cell-data {
      font-size: 9px;
      color: #333;
    }
  `;

  private categoryById(id: string | undefined): Category | undefined {
    return id ? this.categories.find((category) => category.id === id) : undefined;
  }

  private colorCells(): NeatocalColorCell[] {
    const cells: NeatocalColorCell[] = [];

    for (const [date, mark] of Object.entries(this.dateMarks)) {
      const category = this.categoryById(mark.categoryId);

      if (!category) {
        continue;
      }

      cells.push({
        date,
        color: category.visible === false ? hexToRgba(category.color, 0.18) : category.color,
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
