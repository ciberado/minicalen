import '@minicalen/renderer';
import { SCHEMA_VERSION } from '@minicalen/shared';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `<year-grid></year-grid><p>MiniCalen v2 (schema v${SCHEMA_VERSION})</p>`;
}
