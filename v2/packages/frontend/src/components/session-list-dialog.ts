import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { SessionSummary } from '../api/client';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';

export class SessionListDialog extends StoreElement {
  @property({ type: Boolean }) open = false;
  @state() private sessions: SessionSummary[] = [];
  @state() private loading = false;

  static styles = css`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(46, 56, 51, 0.28);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: var(--zen-font);
    }

    .dialog {
      background: var(--zen-surface);
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius);
      padding: 24px;
      width: 540px;
      max-width: 92vw;
      max-height: 80vh;
      overflow: auto;
      box-shadow: var(--zen-shadow-lg);
      animation: rise 220ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    @keyframes rise {
      from {
        opacity: 0;
        transform: translateY(10px) scale(0.99);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 600;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 9px 16px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
      transition: background var(--zen-transition), transform var(--zen-transition);
    }

    button.primary {
      background: var(--zen-accent);
      color: var(--zen-surface);
    }

    button.primary:hover {
      background: var(--zen-accent-strong);
      transform: translateY(-1px);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 10px;
      border-bottom: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      transition: background var(--zen-transition);
    }

    li:hover {
      background: var(--zen-surface-2);
    }

    li:last-child {
      border-bottom: none;
    }

    .info {
      flex: 1;
      min-width: 0;
      cursor: pointer;
    }

    .name {
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta {
      font-size: 12px;
      color: var(--zen-ink-faint);
      margin-top: 2px;
    }

    .chip {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: var(--zen-accent-soft);
      border-radius: 999px;
      padding: 2px 9px;
      color: var(--zen-accent-strong);
    }

    .row-actions button {
      background: none;
      padding: 6px 8px;
      font-size: 14px;
      border-radius: var(--zen-radius-sm);
    }

    .row-actions button:hover {
      background: var(--zen-accent-soft);
    }

    .empty {
      color: var(--zen-ink-soft);
      font-size: 14px;
      padding: 20px 0;
      text-align: center;
    }
  `;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open') && this.open) {
      void this.load();
    }
  }

  private async load(): Promise<void> {
    this.loading = true;

    try {
      this.sessions = await appStore.listSessions();
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (!this.open) {
      return html``;
    }

    const user = appStore.getState().user;

    return html`
      <div class="overlay" @click=${(event: Event) => event.target === event.currentTarget && appStore.closeSessionList()}>
        <div class="dialog">
          <header>
            <h2>My Calendars</h2>
            ${user
              ? html`<button class="primary" @click=${() => appStore.createSession()}>New Calendar</button>`
              : ''}
          </header>
          ${!user
            ? html`<p class="empty">Sign in to keep multiple calendars and share them.</p>`
            : this.loading
              ? html`<p class="empty">Loading…</p>`
              : this.sessions.length === 0
                ? html`<p class="empty">No calendars yet. Create your first one!</p>`
                : html`
                    <ul>
                      ${this.sessions.map(
                        (session) => html`
                          <li>
                            <div class="info" @click=${() => appStore.openSession(session.id)}>
                              <div class="name">
                                ${session.name}
                                ${session.accessLevel !== 'owner'
                                  ? html`<span class="chip">${session.accessLevel}</span>`
                                  : ''}
                              </div>
                              <div class="meta">
                                Updated ${new Date(session.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div class="row-actions">
                              ${session.accessLevel === 'owner'
                                ? html`<button
                                    title="Share"
                                    @click=${() => appStore.openShareDialog(session.id)}
                                  >
                                    🔗
                                  </button>`
                                : ''}
                              ${session.accessLevel === 'owner'
                                ? html`<button
                                    title="Delete"
                                    @click=${() => this.confirmDelete(session.id)}
                                  >
                                    🗑
                                  </button>`
                                : ''}
                            </div>
                          </li>
                        `,
                      )}
                    </ul>
                  `}
        </div>
      </div>
    `;
  }

  private confirmDelete(id: string): void {
    if (window.confirm('Delete this calendar?')) {
      void appStore.deleteSession(id).then(() => this.load());
    }
  }
}

if (!customElements.get('session-list-dialog')) {
  customElements.define('session-list-dialog', SessionListDialog);
}
