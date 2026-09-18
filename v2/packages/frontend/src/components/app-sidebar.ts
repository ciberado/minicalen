import { css, html } from 'lit';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';
import './category-list';

export class AppSidebar extends StoreElement {
  static styles = css`
    :host {
      width: 300px;
      flex: none;
      height: 100%;
      overflow: auto;
      background: #fff;
      border-right: 1px solid #e0e0e0;
      padding: 16px;
      box-sizing: border-box;
      font-family: system-ui, sans-serif;
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    h1 {
      flex: 1;
      margin: 0;
      font-size: 18px;
    }

    .icon-button {
      border: none;
      background: none;
      cursor: pointer;
      font-size: 16px;
      padding: 4px 6px;
      border-radius: 6px;
    }

    .icon-button:hover {
      background: #f0f0f0;
    }

    .session-name {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font: inherit;
      font-size: 13px;
      margin-bottom: 14px;
    }

    .banner {
      background: #e3f2fd;
      border: 1px solid #bbdefb;
      border-radius: 6px;
      padding: 8px;
      font-size: 12px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .banner button {
      border: none;
      background: #1976d2;
      color: #fff;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      flex: none;
    }

    .banner.readonly {
      background: #fff3e0;
      border-color: #ffe0b2;
      color: #e65100;
    }

    .peers {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
    }

    .peer {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #455a64;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-menu {
      position: relative;
    }

    .user-menu summary {
      list-style: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #1976d2;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .user-menu summary::-webkit-details-marker {
      display: none;
    }

    .user-menu .menu {
      position: absolute;
      right: 0;
      top: 34px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      padding: 6px;
      min-width: 180px;
      z-index: 20;
    }

    .user-menu .menu button,
    .user-menu .menu .email {
      display: block;
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      padding: 6px 8px;
      border-radius: 4px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      box-sizing: border-box;
    }

    .user-menu .menu .email {
      color: #666;
      cursor: default;
      font-size: 12px;
      border-bottom: 1px solid #eee;
      border-radius: 0;
    }

    .user-menu .menu button:hover {
      background: #f0f0f0;
    }

    .view-switch {
      display: flex;
      gap: 4px;
      margin-bottom: 14px;
    }

    .view-switch button {
      flex: 1;
      border: 1px solid #ddd;
      background: #fff;
      border-radius: 6px;
      padding: 4px 8px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      color: #555;
    }

    .view-switch button.active {
      background: #1976d2;
      border-color: #1976d2;
      color: #fff;
    }

    .status {
      margin-top: 12px;
      font-size: 11px;
      color: #888;
    }
  `;

  render() {
    const state = appStore.getState();
    const user = state.user;
    const canEdit = appStore.canEdit;

    return html`
      <header>
        <h1>MiniCalen</h1>
        <button class="icon-button" title="Save" ?disabled=${state.busy} @click=${() => appStore.save()}>
          💾
        </button>
        <details class="user-menu">
          <summary>${user ? user.email.charAt(0) : '?'}</summary>
          <div class="menu">
            ${user
              ? html`
                  <div class="email">${user.email}</div>
                  <button @click=${() => appStore.openSessionList()}>My Calendars</button>
                  <button @click=${() => appStore.signOut()}>Sign out</button>
                `
              : html`<button @click=${() => appStore.openAuthDialog()}>Sign in / Sign up</button>`}
          </div>
        </details>
      </header>

      ${state.isAnonymous && user
        ? html`<div class="banner">
            <span>Anonymous calendar</span>
            <button @click=${() => appStore.claim()}>Save to account</button>
          </div>`
        : ''}
      ${state.accessLevel === 'viewer' || state.session.readOnly
        ? html`<div class="banner readonly">View-only — you cannot edit this calendar.</div>`
        : ''}
      ${state.session.peers.length > 0
        ? html`<div class="peers">
            ${state.session.peers.map(
              (peer) => html`<span class="peer" title=${peer.user.email}
                >${(peer.user.name ?? peer.user.email).charAt(0).toUpperCase()}</span
              >`,
            )}
          </div>`
        : ''}

      <input
        class="session-name"
        .value=${state.sessionName}
        ?disabled=${!canEdit}
        @change=${(event: Event) =>
          appStore.renameSession((event.target as HTMLInputElement).value || 'Untitled Calendar')}
      />

      <div class="view-switch">
        <button
          class=${state.view === 'grid' ? 'active' : ''}
          @click=${() => appStore.setView('grid')}
        >
          Grid
        </button>
        <button
          class=${state.view === 'print' ? 'active' : ''}
          @click=${() => appStore.setView('print')}
        >
          Print
        </button>
      </div>

      <category-list type="foreground"></category-list>
      <category-list type="text"></category-list>

      <div class="status">
        ${state.session.status}${state.accessLevel ? ` · ${state.accessLevel}` : ''}
      </div>
    `;
  }
}

if (!customElements.get('app-sidebar')) {
  customElements.define('app-sidebar', AppSidebar);
}
