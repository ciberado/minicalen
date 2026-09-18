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
      padding: 16px;
      overflow: auto;
      background: #fafafa;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      font-family: system-ui, sans-serif;
    }

    .toast {
      position: fixed;
      right: 16px;
      bottom: 16px;
      max-width: 360px;
      padding: 10px 14px;
      border-radius: 6px;
      font: 14px system-ui, sans-serif;
      color: white;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      z-index: 1000;
    }

    .toast.error {
      background: #d32f2f;
    }

    .toast.notice {
      background: #2e7d32;
    }
  `;

  override firstUpdated(): void {
    void appStore.init();
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
          <year-grid></year-grid>
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
