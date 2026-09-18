import { css, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';

export class AuthDialog extends StoreElement {
  @property({ type: Boolean }) open = false;
  @state() private mode: 'signin' | 'signup' = 'signin';
  @state() private email = '';
  @state() private password = '';
  @state() private name = '';

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
      padding: 24px;
      width: 360px;
      max-width: 90vw;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
    }

    h2 {
      margin: 0 0 16px;
      font-size: 18px;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    input {
      padding: 8px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font: inherit;
      font-size: 14px;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }

    button {
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      font: inherit;
      cursor: pointer;
    }

    button.primary {
      background: #1976d2;
      color: #fff;
    }

    button.link {
      background: none;
      color: #1976d2;
      padding: 4px;
      font-size: 13px;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `;

  private submit(event: Event): void {
    event.preventDefault();

    if (this.mode === 'signin') {
      void appStore.signIn(this.email, this.password);
    } else {
      void appStore.signUp(this.email, this.password, this.name || undefined);
    }
  }

  render() {
    if (!this.open) {
      return html``;
    }

    const busy = appStore.getState().busy;

    return html`
      <div class="overlay" @click=${(event: Event) => event.target === event.currentTarget && appStore.closeAuthDialog()}>
        <div class="dialog">
          <h2>${this.mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
          <form @submit=${this.submit}>
            ${this.mode === 'signup'
              ? html`<input
                  placeholder="Name"
                  .value=${this.name}
                  @input=${(event: Event) => (this.name = (event.target as HTMLInputElement).value)}
                />`
              : ''}
            <input
              type="email"
              placeholder="Email"
              required
              .value=${this.email}
              @input=${(event: Event) => (this.email = (event.target as HTMLInputElement).value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              minlength="8"
              .value=${this.password}
              @input=${(event: Event) => (this.password = (event.target as HTMLInputElement).value)}
            />
            <div class="actions">
              <button
                type="button"
                class="link"
                @click=${() => (this.mode = this.mode === 'signin' ? 'signup' : 'signin')}
              >
                ${this.mode === 'signin' ? 'Need an account?' : 'Have an account?'}
              </button>
              <button class="primary" type="submit" ?disabled=${busy}>
                ${this.mode === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

if (!customElements.get('auth-dialog')) {
  customElements.define('auth-dialog', AuthDialog);
}
