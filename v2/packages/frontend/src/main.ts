import '@minicalen/renderer';
import './styles/global.css';
import './components/app-shell';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = '<app-shell></app-shell>';
}
