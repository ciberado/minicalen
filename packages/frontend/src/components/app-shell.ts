import { css, html } from 'lit';
import { appStore } from '../app/app-store';
import type { AppState } from '../app/app-store';
import { StoreElement } from './base-element';
import './app-sidebar';
import './auth-dialog';
import './mobile-year-view';
import './session-list-dialog';
import './share-dialog';

export class AppShell extends StoreElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    .layout {
      display: flex;
      height: 100%;
      overflow: hidden;
    }

    main {
      flex: 1;
      min-width: 0;
      padding: 24px 28px;
      overflow: auto;
      box-sizing: border-box;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--zen-ink-soft);
      font-family: var(--zen-font);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 12px;
    }

    .toast {
      position: fixed;
      right: 22px;
      bottom: 22px;
      max-width: 360px;
      padding: 12px 18px;
      border-radius: var(--zen-radius-md);
      font: 13px var(--zen-font);
      color: var(--zen-surface);
      box-shadow: var(--zen-shadow-lg);
      cursor: pointer;
      z-index: 1000;
      animation: rise 240ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    .toast.error {
      background: var(--zen-danger);
    }

    .toast.notice {
      background: var(--zen-accent-strong);
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(46, 56, 51, 0.35);
      z-index: 30;
    }

    .mobile-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .mobile-bar__menu {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex: none;
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      background: var(--zen-surface);
      color: var(--zen-ink);
      font-size: 18px;
      cursor: pointer;
    }

    .mobile-bar__name {
      min-width: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--zen-ink);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .year-nav {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      margin-bottom: 12px;
      color: var(--zen-ink-faint);
    }

    .year-nav button {
      border: none;
      background: none;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-size: 14px;
      line-height: 1;
      padding: 5px 8px;
      border-radius: var(--zen-radius-sm);
      transition: background var(--zen-transition), color var(--zen-transition);
    }

    .year-nav button:hover {
      background: var(--zen-accent-soft);
      color: var(--zen-accent-strong);
    }

    .year-nav__label {
      font-weight: 600;
      letter-spacing: 0.08em;
    }

    @media (pointer: coarse) and (max-width: 900px) {
      main {
        padding: 16px 14px 28px;
      }
    }

    .print-title {
      display: none;
    }

    @media print {
      :host {
        height: auto;
      }

      .print-title {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8mm;
        margin: 0 0 4mm;
        color: #2e3833;
      }

      .print-title__name {
        font-size: 15pt;
        font-weight: 600;
        letter-spacing: 0.01em;
      }

      .print-title__year {
        font-size: 10pt;
        color: #66736d;
        letter-spacing: 0.14em;
      }

      .layout {
        display: block;
        height: auto;
        overflow: visible;
      }

      app-sidebar,
      auth-dialog,
      session-list-dialog,
      share-dialog,
      .mobile-bar,
      .backdrop,
      .year-nav,
      .toast {
        display: none !important;
      }

      main {
        padding: 0;
        overflow: visible;
      }
    }
  `;

  override firstUpdated(): void {
    void appStore.init();
  }

  private handleDateClick(event: CustomEvent<{ date: string }>): void {
    const selected = appStore.selectedCategory;

    if (!selected) {
      return;
    }

    if (selected.type === 'foreground') {
      appStore.toggleDateCategory(event.detail.date, selected.id);
    } else {
      appStore.toggleTextCategory(event.detail.date, selected.id);
    }
  }

  private renderView(state: AppState) {
    if (state.view === 'months') {
      return html`<mobile-year-view
        @date-click=${(event: CustomEvent<{ date: string }>) => this.handleDateClick(event)}
      ></mobile-year-view>`;
    }

    if (state.view === 'print') {
      return html`<neatocal-view
        .year=${state.year}
        .categories=${state.session.categories}
        .dateMarks=${state.session.dateMarks}
      ></neatocal-view>`;
    }

    return html`<year-grid
      .year=${state.year}
      .categories=${state.session.categories}
      .dateMarks=${state.session.dateMarks}
      .readOnly=${!appStore.canEdit}
      .selectedCategoryId=${state.selectedCategoryId}
      @date-click=${(event: CustomEvent<{ date: string }>) => this.handleDateClick(event)}
    ></year-grid>`;
  }

  private renderYearNav(state: AppState) {
    if (state.view === 'months') {
      return '';
    }

    return html`<div class="year-nav">
      <button title="Previous year" @click=${() => appStore.prevYear()}>‹</button>
      <button class="year-nav__label" title="Go to current year" @click=${() => appStore.goToCurrentYear()}>
        ${state.year}
      </button>
      <button title="Next year" @click=${() => appStore.nextYear()}>›</button>
    </div>`;
  }

  render() {
    const state: AppState = appStore.getState();

    if (!state.ready) {
      return html`<div class="loading">Loading…</div>`;
    }

    return html`
      <div class="layout">
        <app-sidebar .open=${state.sidebarOpen}></app-sidebar>
        ${state.viewport.isMobile && state.sidebarOpen
          ? html`<div class="backdrop" @click=${() => appStore.closeSidebar()}></div>`
          : ''}
        <main>
          ${state.viewport.isMobile
            ? html`<div class="mobile-bar">
                <button
                  class="mobile-bar__menu"
                  title="Menu"
                  @click=${() => appStore.toggleSidebar()}
                >
                  ☰
                </button>
                <span class="mobile-bar__name">${state.sessionName}</span>
              </div>`
            : ''}
          <div class="print-title">
            <span class="print-title__name">${state.sessionName}</span>
            <span class="print-title__year">${state.year}</span>
          </div>
          ${this.renderYearNav(state)} ${this.renderView(state)}
        </main>
      </div>
      <auth-dialog .open=${state.showAuthDialog}></auth-dialog>
      <session-list-dialog .open=${state.showSessionList}></session-list-dialog>
      <share-dialog .open=${Boolean(state.shareSessionId)}></share-dialog>
      ${state.error
        ? html`<div class="toast error" @click=${() => appStore.clearError()}>${state.error}</div>`
        : ''}
      ${state.notice
        ? html`<div class="toast notice" @click=${() => appStore.clearNotice()}>${state.notice}</div>`
        : ''}
    `;
  }
}

if (!customElements.get('app-shell')) {
  customElements.define('app-shell', AppShell);
}
