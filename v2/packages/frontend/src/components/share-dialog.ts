import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import type { AccessLevel } from '@minicalen/shared';
import { api, type PermissionEntry } from '../api/client';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';

export class ShareDialog extends StoreElement {
  @property({ type: Boolean }) open = false;
  @state() private email = '';
  @state() private accessLevel: Exclude<AccessLevel, 'owner'> = 'viewer';
  @state() private permissions: PermissionEntry[] = [];

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
      width: 480px;
      max-width: 92vw;
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

    h2 {
      margin: 0 0 16px;
      font-size: 19px;
      font-weight: 600;
    }

    form {
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
    }

    input,
    select {
      padding: 10px 12px;
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      background: var(--zen-surface);
      color: var(--zen-ink);
      font: inherit;
      font-size: 14px;
      transition: border-color var(--zen-transition), box-shadow var(--zen-transition);
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--zen-accent);
      box-shadow: 0 0 0 3px var(--zen-accent-ring);
    }

    input {
      flex: 1;
      min-width: 0;
    }

    button {
      border: none;
      border-radius: 999px;
      padding: 10px 18px;
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
      justify-content: space-between;
      padding: 10px 6px;
      border-bottom: 1px solid var(--zen-line);
      font-size: 13px;
    }

    li:last-child {
      border-bottom: none;
    }

    .level {
      color: var(--zen-ink-soft);
      text-transform: capitalize;
    }
  `;

  override updated(changed: Map<string, unknown>): void {
    if (changed.has('open') && this.open) {
      void this.loadPermissions();
    }
  }

  private async loadPermissions(): Promise<void> {
    const id = appStore.getState().shareSessionId;

    if (!id) {
      this.permissions = [];
      return;
    }

    try {
      const { permissions } = await api.getPermissions(id);
      this.permissions = permissions;
    } catch {
      this.permissions = [];
    }
  }

  private async submit(event: Event): Promise<void> {
    event.preventDefault();
    const ok = await appStore.share(this.email, this.accessLevel);

    if (ok) {
      this.email = '';
      await this.loadPermissions();
    }
  }

  render() {
    if (!this.open) {
      return html``;
    }

    return html`
      <div class="overlay" @click=${(event: Event) => event.target === event.currentTarget && appStore.closeShareDialog()}>
        <div class="dialog">
          <h2>Share calendar</h2>
          <form @submit=${this.submit}>
            <input
              type="email"
              placeholder="Email address"
              required
              .value=${this.email}
              @input=${(event: Event) => (this.email = (event.target as HTMLInputElement).value)}
            />
            <select
              .value=${this.accessLevel}
              @change=${(event: Event) =>
                (this.accessLevel = (event.target as HTMLSelectElement).value as 'viewer' | 'editor')}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button class="primary" type="submit">Share</button>
          </form>
          ${this.permissions.length > 0
            ? html`<ul>
                ${this.permissions.map(
                  (permission) => html`<li>
                    <span>${permission.email}</span>
                    <span class="level">${permission.accessLevel}</span>
                  </li>`,
                )}
              </ul>`
            : ''}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('share-dialog')) {
  customElements.define('share-dialog', ShareDialog);
}
