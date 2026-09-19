import { css, html } from 'lit';
import { appStore } from '../app/app-store';
import type { AppState } from '../app/app-store';
import { StoreElement } from './base-element';
import './app-sidebar';
import './auth-dialog';
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

  render() {
    const state: AppState = appStore.getState();

    if (!state.ready) {
      return html`<div class="loading">Loading…</div>`;
    }

    return html`
      <div class="layout">
        <app-sidebar></app-sidebar>
        <main>
          ${state.view === 'grid'
            ? html`<year-grid
                .year=${new Date().getFullYear()}
                .categories=${state.session.categories}
                .dateMarks=${state.session.dateMarks}
                .readOnly=${!appStore.canEdit}
                .selectedCategoryId=${state.selectedCategoryId}
                @date-click=${(event: CustomEvent<{ date: string }>) => this.handleDateClick(event)}
              ></year-grid>`
            : html`<neatocal-view
                .year=${new Date().getFullYear()}
                .categories=${state.session.categories}
                .dateMarks=${state.session.dateMarks}
              ></neatocal-view>`}
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
