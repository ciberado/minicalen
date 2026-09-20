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
      padding: 28px;
      width: 380px;
      max-width: 90vw;
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
      margin: 0 0 18px;
      font-size: 19px;
      font-weight: 600;
      letter-spacing: 0.01em;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    input {
      padding: 11px 13px;
      border: 1px solid var(--zen-line);
      border-radius: var(--zen-radius-md);
      background: var(--zen-surface);
      color: var(--zen-ink);
      font: inherit;
      font-size: 14px;
      transition: border-color var(--zen-transition), box-shadow var(--zen-transition);
    }

    input:focus {
      outline: none;
      border-color: var(--zen-accent);
      box-shadow: 0 0 0 3px var(--zen-accent-ring);
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
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

    button.link {
      background: none;
      color: var(--zen-accent-strong);
      padding: 4px;
      font-size: 13px;
    }

    button.link:hover {
      text-decoration: underline;
    }

    button:disabled {
      opacity: 0.55;
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
