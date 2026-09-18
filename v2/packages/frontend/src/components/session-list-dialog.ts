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
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      font-family: system-ui, sans-serif;
    }

    .dialog {
      background: #fff;
      border-radius: 10px;
      padding: 20px;
      width: 520px;
      max-width: 92vw;
      max-height: 80vh;
      overflow: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0;
      font-size: 18px;
    }

    button {
      border: none;
      border-radius: 6px;
      padding: 6px 12px;
      font: inherit;
      font-size: 13px;
      cursor: pointer;
    }

    button.primary {
      background: #1976d2;
      color: #fff;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 8px;
      border-bottom: 1px solid #eee;
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
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta {
      font-size: 12px;
      color: #888;
    }

    .chip {
      font-size: 11px;
      background: #eee;
      border-radius: 10px;
      padding: 1px 8px;
      color: #555;
    }

    .row-actions button {
      background: none;
      padding: 4px 6px;
    }

    .empty {
      color: #777;
      font-size: 14px;
      padding: 16px 0;
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
