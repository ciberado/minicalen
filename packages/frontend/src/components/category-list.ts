import { css, html } from 'lit';
import { property } from 'lit/decorators.js';
import type { CategoryType } from '@minicalen/shared';
import { appStore } from '../app/app-store';
import { StoreElement } from './base-element';

export class CategoryList extends StoreElement {
  @property({ type: String }) type: CategoryType = 'foreground';

  static styles = css`
    :host {
      display: block;
      margin-bottom: 26px;
      font-family: var(--zen-font);
    }

    h3 {
      margin: 0 0 10px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--zen-ink-faint);
      font-weight: 600;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    li {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 6px 8px;
      border-radius: var(--zen-radius-md);
      border: 1px solid transparent;
      transition: background var(--zen-transition), border-color var(--zen-transition),
        box-shadow var(--zen-transition);
    }

    li:hover {
      background: var(--zen-surface-2);
    }

    li.selected {
      background: var(--zen-surface);
      border-color: var(--zen-accent);
      box-shadow: 0 0 0 3px var(--zen-accent-ring);
    }

    .swatch {
      width: 26px;
      height: 26px;
      border-radius: 9px;
      border: none;
      cursor: pointer;
      flex: none;
      font-size: 10px;
      font-weight: 800;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform var(--zen-transition), box-shadow var(--zen-transition);
    }

    .swatch:hover {
      transform: scale(1.08);
    }

    li.selected .swatch {
      transform: scale(1.06);
    }

    .label {
      flex: 1;
      min-width: 0;
      border: 1px solid transparent;
      background: transparent;
      color: var(--zen-ink);
      font: inherit;
      font-size: 13px;
      padding: 4px 6px;
      border-radius: var(--zen-radius-sm);
      transition: background var(--zen-transition), border-color var(--zen-transition),
        box-shadow var(--zen-transition);
    }

    .label:hover {
      background: var(--zen-surface-2);
    }

    .label:focus {
      outline: none;
      background: var(--zen-surface);
      border-color: var(--zen-accent);
      box-shadow: 0 0 0 3px var(--zen-accent-ring);
    }

    input[type='color'] {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--zen-line);
      border-radius: 7px;
      background: none;
      cursor: pointer;
      flex: none;
    }

    input[type='color']::-webkit-color-swatch-wrapper {
      padding: 2px;
    }

    input[type='color']::-webkit-color-swatch {
      border: none;
      border-radius: 5px;
    }

    .toggle {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      color: var(--zen-ink-faint);
      flex: none;
      cursor: pointer;
    }

    .toggle input {
      accent-color: var(--zen-accent);
      cursor: pointer;
    }

    .delete {
      border: none;
      background: none;
      cursor: pointer;
      color: var(--zen-ink-faint);
      font-size: 15px;
      line-height: 1;
      padding: 3px 5px;
      border-radius: 7px;
      flex: none;
      transition: background var(--zen-transition), color var(--zen-transition);
    }

    .delete:hover {
      background: #f3e2df;
      color: var(--zen-danger);
    }

    .add {
      margin-top: 8px;
      border: 1px dashed var(--zen-line-strong);
      background: none;
      border-radius: 999px;
      padding: 6px 14px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      color: var(--zen-ink-soft);
      transition: background var(--zen-transition), border-color var(--zen-transition),
        color var(--zen-transition);
    }

    .add:hover {
      background: var(--zen-accent-soft);
      border-color: var(--zen-accent);
      color: var(--zen-accent-strong);
    }

    .add:disabled,
    input:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
  `;

  render() {
    const state = appStore.getState();
    const categories = state.session.categories.filter((category) => category.type === this.type);
    const readOnly = !appStore.canEdit;
    const title = this.type === 'foreground' ? 'Foreground' : 'Text labels';

    return html`
      <section>
        <h3>${title}</h3>
        <ul>
          ${categories.map((category) => {
            const selected = state.selectedCategoryId === category.id;

            return html`
              <li class=${selected ? 'selected' : ''}>
                <span
                  class="swatch"
                  style="background:${category.color};box-shadow:0 0 0 2px var(--zen-surface),0 0 0 3px ${category.color}55,0 10px 18px -10px ${category.color}"
                  title="Select ${category.label}"
                  @click=${() => appStore.selectCategory(category.id)}
                  >${this.type === 'text' ? appStore.symbolFor(category) : ''}</span
                >
                <input
                  class="label"
                  .value=${category.label}
                  ?disabled=${readOnly}
                  @change=${(event: Event) =>
                    appStore.updateCategory(category.id, {
                      label: (event.target as HTMLInputElement).value || category.label,
                    })}
                />
                <input
                  type="color"
                  .value=${category.color}
                  ?disabled=${readOnly}
                  @input=${(event: Event) =>
                    appStore.updateCategory(category.id, {
                      color: (event.target as HTMLInputElement).value,
                    })}
                />
                <label
                  class="toggle"
                  title="Enabled — can be applied to days and its marks are shown"
                >
                  <input
                    type="checkbox"
                    .checked=${category.active && category.visible}
                    ?disabled=${readOnly}
                    @change=${(event: Event) => {
                      const enabled = (event.target as HTMLInputElement).checked;
                      appStore.updateCategory(category.id, { active: enabled, visible: enabled });
                    }}
                  />
                </label>
                <button
                  class="delete"
                  title="Delete"
                  ?disabled=${readOnly}
                  @click=${() => appStore.deleteCategory(category.id)}
                >
                  ×
                </button>
              </li>
            `;
          })}
        </ul>
        <button class="add" ?disabled=${readOnly} @click=${() => appStore.addCategory(this.type)}>
          + Add
        </button>
      </section>
    `;
  }
}

if (!customElements.get('category-list')) {
  customElements.define('category-list', CategoryList);
}
