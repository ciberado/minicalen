import { LitElement } from 'lit';
import { appStore } from '../app/app-store';

export class StoreElement extends LitElement {
  private unsubscribeStore?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this.unsubscribeStore = appStore.subscribe(() => this.requestUpdate());
  }

  override disconnectedCallback(): void {
    this.unsubscribeStore?.();
    super.disconnectedCallback();
  }

  protected get store() {
    return appStore;
  }
}
