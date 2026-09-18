import { LitElement, css, html } from 'lit';

export class YearGrid extends LitElement {
  static styles = css`
    :host {
      display: block;
    }

    .months {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }
  `;

  render() {
    return html`<div class="months"><slot></slot></div>`;
  }
}

if (!customElements.get('year-grid')) {
  customElements.define('year-grid', YearGrid);
}
