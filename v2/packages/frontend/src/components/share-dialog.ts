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
      width: 460px;
      max-width: 92vw;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
    }

    h2 {
      margin: 0 0 14px;
      font-size: 18px;
    }

    form {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }

    input,
    select {
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font: inherit;
      font-size: 14px;
    }

    input {
      flex: 1;
      min-width: 0;
    }

    button {
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
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
      justify-content: space-between;
      padding: 8px 4px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
    }

    li:last-child {
      border-bottom: none;
    }

    .level {
      color: #666;
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
