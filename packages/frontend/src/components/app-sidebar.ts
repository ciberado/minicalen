import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';
import './category-list';

export class AppSidebar extends StoreElement {
  @property({ type: Boolean, reflect: true }) open = false;

  static styles = css`
    :host {
      width: 312px;
      flex: none;
      height: 100%;
      overflow: auto;
      background: color-mix(in srgb, var(--zen-surface) 88%, transparent);
      backdrop-filter: blur(8px);
      border-right: 1px solid var(--zen-line);
      padding: 22px 20px 28px;
      box-sizing: border-box;
      font-family: var(--zen-font);
      display: block;
    }

    header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 18px;
    }

    h1 {
      flex: 1;
      margin: 0;
      font-size: 19px;
      font-weight: 600;
      letter-spacing: 0.01em;
      color: var(--zen-ink);
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      background: none;
      color: var(--zen-ink-soft);
      cursor: pointer;
      font-size: 16px;
      padding: 6px 8px;
      border-radius: var(--zen-radius-sm);
      transition: background var(--zen-transition), border-color var(--zen-transition),
        transform var(--zen-transition);
    }

    .icon-button:hover {
      background: var(--zen-accent-soft);
      border-color: var(--zen-line);
      transform: translateY(-1px);
    }

    .session-name {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      background: var(--zen-surface);
      color: var(--zen-ink);
      font: inherit;
      font-size: 13px;
      margin-bottom: 16px;
      transition: border-color var(--zen-transition), box-shadow var(--zen-transition);
    }

    .session-name:focus {
      outline: none;
      border-color: var(--zen-accent);
      box-shadow: 0 0 0 3px var(--zen-accent-ring);
    }

    .banner {
      background: var(--zen-accent-soft);
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      padding: 10px 12px;
      font-size: 12px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--zen-accent-strong);
    }

    .banner button {
      border: none;
      background: var(--zen-accent);
      color: var(--zen-surface);
      border-radius: 999px;
      padding: 5px 12px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      flex: none;
      transition: background var(--zen-transition), transform var(--zen-transition);
    }

    .banner button:hover {
      background: var(--zen-accent-strong);
      transform: translateY(-1px);
    }

    .banner.readonly {
      background: var(--zen-warn-soft);
      color: var(--zen-warn);
    }

    .peers {
      display: flex;
      gap: 6px;
      margin-bottom: 14px;
    }

    .peer {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--zen-accent-strong);
      color: var(--zen-surface);
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 2px var(--zen-surface);
    }

    .user-menu {
      position: relative;
    }

    .user-menu summary {
      list-style: none;
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--zen-accent);
      color: var(--zen-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      transition: background var(--zen-transition);
    }

    .user-menu summary:hover {
      background: var(--zen-accent-strong);
    }

    .user-menu summary::-webkit-details-marker {
      display: none;
    }

    .user-menu .menu {
      position: absolute;
      right: 0;
      top: 38px;
      background: var(--zen-surface);
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      box-shadow: var(--zen-shadow-lg);
      padding: 6px;
      min-width: 190px;
      z-index: 20;
    }

    .user-menu .menu button,
    .user-menu .menu .email {
      display: block;
      width: 100%;
      text-align: left;
      border: none;
      background: none;
      padding: 8px 10px;
      border-radius: var(--zen-radius-sm);
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      box-sizing: border-box;
      color: var(--zen-ink);
    }

    .user-menu .menu .email {
      color: var(--zen-ink-faint);
      cursor: default;
      font-size: 12px;
      border-bottom: 1px solid var(--zen-line);
      border-radius: 0;
      margin-bottom: 4px;
    }

    .user-menu .menu button:hover {
      background: var(--zen-accent-soft);
    }

    .view-switch {
      display: flex;
      gap: 3px;
      margin-bottom: 18px;
      padding: 3px;
      background: var(--zen-surface-2);
      border-radius: 999px;
    }

    .view-switch button {
      flex: 1;
      border: none;
      background: none;
      border-radius: 999px;
      padding: 7px 8px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      color: var(--zen-ink-soft);
      transition: background var(--zen-transition), color var(--zen-transition),
        box-shadow var(--zen-transition);
    }

    .view-switch button.active {
      background: var(--zen-surface);
      color: var(--zen-ink);
      box-shadow: var(--zen-shadow-sm);
    }

    .year-nav {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
      margin: -8px 0 16px;
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

    .status {
      margin-top: 16px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--zen-ink-faint);
    }

    @media (pointer: coarse) and (max-width: 900px) {
      :host {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 40;
        width: min(84vw, 340px);
        transform: translateX(-100%);
        transition: transform var(--zen-transition);
        box-shadow: var(--zen-shadow-lg);
      }

      :host([open]) {
        transform: translateX(0);
      }
    }
  `;

  render() {
    const state = appStore.getState();
    const user = state.user;
    const canEdit = appStore.canEdit;

    return html`
      <header>
        <h1>MiniCalen</h1>
        <button
          class="icon-button"
          title="New calendar"
          ?disabled=${state.busy}
          @click=${() => appStore.newCalendar()}
        >
          ＋
        </button>
        <button class="icon-button" title="Print" @click=${() => window.print()}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9V3h12v6" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" rx="1" />
          </svg>
        </button>
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
        ${state.viewport.isMobile
          ? html`<button
              class=${state.view === 'months' ? 'active' : ''}
              @click=${() => appStore.setView('months')}
            >
              Months
            </button>`
          : ''}
        <button
          class=${state.view === 'print' ? 'active' : ''}
          @click=${() => appStore.setView('print')}
        >
          Print
        </button>
      </div>

      ${state.view === 'months'
        ? ''
        : html`<div class="year-nav">
            <button title="Previous year" @click=${() => appStore.prevYear()}>‹</button>
            <button
              class="year-nav__label"
              title="Go to current year"
              @click=${() => appStore.goToCurrentYear()}
            >
              ${state.year}
            </button>
            <button title="Next year" @click=${() => appStore.nextYear()}>›</button>
          </div>`}

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
