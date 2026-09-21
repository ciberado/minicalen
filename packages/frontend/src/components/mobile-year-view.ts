import { css, html } from 'lit';
import { MONTH_NAMES } from '@minicalen/shared';
import '@minicalen/renderer';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';

export class MobileYearView extends StoreElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      font-family: var(--zen-font);
    }

    .months-nav {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .nav {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      background: var(--zen-surface);
      color: var(--zen-ink);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      transition: background var(--zen-transition), border-color var(--zen-transition);
    }

    .nav:hover:not(:disabled) {
      background: var(--zen-accent-soft);
      border-color: var(--zen-accent);
    }

    .nav:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .range {
      flex: 1;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.02em;
      color: var(--zen-ink);
    }

    .today {
      border: 1px solid var(--zen-line);
      border-radius: 999px;
      background: var(--zen-surface);
      color: var(--zen-ink-soft);
      font: inherit;
      font-size: 12px;
      padding: 8px 14px;
      cursor: pointer;
      transition: background var(--zen-transition), border-color var(--zen-transition);
    }

    .today:hover {
      background: var(--zen-accent-soft);
      border-color: var(--zen-accent);
      color: var(--zen-accent-strong);
    }
  `;

  render() {
    const state = appStore.getState();
    const start = state.mobileMonthStart;
    const year = state.mobileYear;
    const label = `${MONTH_NAMES[start]} – ${MONTH_NAMES[start + 1]} ${year}`;

    return html`
      <div class="months-nav">
        <button class="nav" title="Previous months" @click=${() => appStore.prevMonthPair()}>
          ‹
        </button>
        <span class="range">${label}</span>
        <button class="nav" title="Next months" @click=${() => appStore.nextMonthPair()}>
          ›
        </button>
        <button class="today" @click=${() => appStore.goToToday()}>Today</button>
      </div>
      <year-grid
        .year=${year}
        .startMonth=${start}
        .monthCount=${2}
        .columns=${state.viewport.isPortrait ? 1 : 2}
        .categories=${state.session.categories}
        .dateMarks=${state.session.dateMarks}
        .readOnly=${!appStore.canEdit}
        .selectedCategoryId=${state.selectedCategoryId}
        .showAdjacentDays=${state.showAdjacentDays}
      ></year-grid>
    `;
  }
}

if (!customElements.get('mobile-year-view')) {
  customElements.define('mobile-year-view', MobileYearView);
}
