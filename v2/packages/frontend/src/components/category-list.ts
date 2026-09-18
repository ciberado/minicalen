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
      margin-bottom: 20px;
      font-family: system-ui, sans-serif;
    }

    h3 {
      margin: 0 0 8px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #666;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    li {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
      border-radius: 6px;
      border: 1px solid transparent;
    }

    li.selected {
      border-color: #1976d2;
      background: #e3f2fd;
    }

    .swatch {
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: 1px solid rgba(0, 0, 0, 0.2);
      cursor: pointer;
      flex: none;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .label {
      flex: 1;
      min-width: 0;
      border: none;
      background: transparent;
      font: inherit;
      font-size: 13px;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .label:focus {
      outline: 1px solid #1976d2;
      background: #fff;
    }

    input[type='color'] {
      width: 24px;
      height: 22px;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      flex: none;
    }

    .toggle {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 10px;
      color: #666;
      flex: none;
    }

    .delete {
      border: none;
      background: none;
      cursor: pointer;
      color: #b71c1c;
      font-size: 14px;
      flex: none;
    }

    .add {
      margin-top: 6px;
      border: 1px dashed #bbb;
      background: none;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      color: #555;
    }

    .add:disabled,
    input:disabled {
      opacity: 0.5;
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
                  style="background:${category.color}"
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
                <label class="toggle" title="Active">
                  <input
                    type="checkbox"
                    .checked=${category.active}
                    ?disabled=${readOnly}
                    @change=${(event: Event) =>
                      appStore.updateCategory(category.id, {
                        active: (event.target as HTMLInputElement).checked,
                      })}
                  />A
                </label>
                <label class="toggle" title="Visible">
                  <input
                    type="checkbox"
                    .checked=${category.visible}
                    ?disabled=${readOnly}
                    @change=${(event: Event) =>
                      appStore.updateCategory(category.id, {
                        visible: (event.target as HTMLInputElement).checked,
                      })}
                  />V
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
