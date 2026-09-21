import type { AccessLevel, Category, CategoryType } from '@minicalen/shared';
import {
  MONTH_NAMES,
  SCHEMA_VERSION,
  createId,
  defaultCategories,
  generateSymbol,
  isEmptySnapshot,
} from '@minicalen/shared';
import { api, loadSessionToken, saveSessionToken, type SessionSummary } from '../api/client';
import {
  fetchCurrentUser,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  type AuthUser,
} from '../auth/client';
import { sessionStore, type SessionViewState } from '../yjs/session-store';
import { readViewport, subscribeViewport, type ViewportState } from './viewport';

export type AppView = 'grid' | 'print' | 'months';

const MONTH_PAIR_SIZE = 2;

function currentMonthPair(): number {
  const month = new Date().getMonth();
  return month - (month % MONTH_PAIR_SIZE);
}

const ADJACENT_DAYS_KEY = 'minicalen-show-adjacent-days';

function loadAdjacentDaysPreference(): boolean {
  try {
    return localStorage.getItem(ADJACENT_DAYS_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function parseSessionHash(hash: string): { id: string; token: string | null } {
  const raw = hash.replace(/^#/, '');

  if (!raw) {
    return { id: '', token: null };
  }

  const separator = raw.indexOf('?');
  const id = separator === -1 ? raw : raw.slice(0, separator);
  const token = new URLSearchParams(separator === -1 ? '' : raw.slice(separator + 1)).get('k');

  return { id, token };
}

const PALETTE = [
  '#E0A097',
  '#E8B98E',
  '#E2CF95',
  '#C2CE9C',
  '#A6C4A0',
  '#9FC7B6',
  '#9FBED6',
  '#AEB3D7',
  '#C6A9CD',
  '#D8A7B7',
];

export interface AppState {
  ready: boolean;
  user: AuthUser | null;
  authLoading: boolean;
  session: SessionViewState;
  sessionName: string;
  isAnonymous: boolean;
  accessLevel: AccessLevel | null;
  view: AppView;
  year: number;
  showAdjacentDays: boolean;
  viewport: ViewportState;
  mobileYear: number;
  mobileMonthStart: number;
  sidebarOpen: boolean;
  selectedCategoryId: string | null;
  showAuthDialog: boolean;
  showSessionList: boolean;
  shareSessionId: string | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
}

type Listener = () => void;

class AppStore {
  private readonly listeners = new Set<Listener>();
  private state: AppState = {
    ready: false,
    user: null,
    authLoading: true,
    session: sessionStore.getState(),
    sessionName: 'Untitled Calendar',
    isAnonymous: true,
    accessLevel: null,
    view: 'grid',
    year: new Date().getFullYear(),
    showAdjacentDays: loadAdjacentDaysPreference(),
    viewport: readViewport(),
    mobileYear: new Date().getFullYear(),
    mobileMonthStart: currentMonthPair(),
    sidebarOpen: false,
    selectedCategoryId: null,
    showAuthDialog: false,
    showSessionList: false,
    shareSessionId: null,
    busy: false,
    error: null,
    notice: null,
  };

  private viewUserChosen = false;
  private hashListenerBound = false;

  constructor() {
    sessionStore.subscribe(() => this.syncSession());
    this.applyViewport(readViewport());
    subscribeViewport((viewport) => this.applyViewport(viewport));
  }

  private applyViewport(viewport: ViewportState): void {
    const patch: Partial<AppState> = { viewport };

    if (!this.viewUserChosen) {
      if (viewport.isMobile) {
        patch.view = 'months';
      } else if (this.state.view === 'months') {
        patch.view = 'grid';
      }
    }

    this.setState(patch);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): AppState {
    return this.state;
  }

  get canEdit(): boolean {
    return this.state.accessLevel !== 'viewer' && !this.state.session.readOnly;
  }

  symbolFor(category: Category): string {
    return generateSymbol(category.label);
  }

  async init(): Promise<void> {
    await this.refreshUser();

    if (!this.hashListenerBound) {
      this.hashListenerBound = true;
      window.addEventListener('hashchange', () => void this.handleHashChange());
    }

    const { id, token } = parseSessionHash(window.location.hash);

    if (id && token) {
      saveSessionToken(id, token);
    }

    if (id) {
      await this.openSession(id);
    } else {
      await this.loadLocalCalendar();
    }

    this.setState({ ready: true });
  }

  private async loadLocalCalendar(): Promise<void> {
    await sessionStore.loadLocal();
    this.setState({ sessionName: 'Untitled Calendar', isAnonymous: true, accessLevel: null });
    await this.seedDefaultsIfEmpty();
  }

  private sessionHash(id: string): string {
    const token = loadSessionToken(id);
    return token ? `#${id}?k=${token}` : `#${id}`;
  }

  private setHash(id: string | null): void {
    const hash = id ? this.sessionHash(id) : '';
    const target = hash || window.location.pathname + window.location.search;

    if ((window.location.hash || '') === hash) {
      return;
    }

    window.history.replaceState(null, '', target);
  }

  private async handleHashChange(): Promise<void> {
    const { id, token } = parseSessionHash(window.location.hash);

    if (id && token) {
      saveSessionToken(id, token);
    }

    const current = this.state.session.sessionId ?? '';

    if (id === current) {
      return;
    }

    if (id) {
      await this.openSession(id);
    } else {
      await this.loadLocalCalendar();
    }
  }

  private async seedDefaultsIfEmpty(): Promise<void> {
    if (!this.canEdit) {
      return;
    }

    if (isEmptySnapshot(sessionStore.getSnapshot())) {
      await sessionStore.applyRemoteSnapshot({
        schemaVersion: SCHEMA_VERSION,
        categories: defaultCategories(),
        dateMarks: {},
      });
    }
  }

  private syncSession(): void {
    this.setState({ session: sessionStore.getState() });
  }

  private setState(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.setState({ error: message });
  }

  clearError(): void {
    this.setState({ error: null });
  }

  clearNotice(): void {
    this.setState({ notice: null });
  }

  private async refreshUser(): Promise<void> {
    this.setState({ authLoading: true });

    try {
      const user = await fetchCurrentUser();
      sessionStore.setLocalUser(user);
      this.setState({ user, authLoading: false });
    } catch {
      sessionStore.setLocalUser(null);
      this.setState({ user: null, authLoading: false });
    }
  }

  openAuthDialog(): void {
    this.setState({ showAuthDialog: true });
  }

  closeAuthDialog(): void {
    this.setState({ showAuthDialog: false });
  }

  openSessionList(): void {
    this.setState({ showSessionList: true });
  }

  closeSessionList(): void {
    this.setState({ showSessionList: false });
  }

  openShareDialog(sessionId: string): void {
    this.setState({ shareSessionId: sessionId, showSessionList: false });
  }

  closeShareDialog(): void {
    this.setState({ shareSessionId: null });
  }

  setView(view: AppView): void {
    this.viewUserChosen = true;
    this.setState({ view });
  }

  prevYear(): void {
    this.setState({ year: this.state.year - 1 });
  }

  nextYear(): void {
    this.setState({ year: this.state.year + 1 });
  }

  goToCurrentYear(): void {
    this.setState({ year: new Date().getFullYear() });
  }

  setShowAdjacentDays(value: boolean): void {
    try {
      localStorage.setItem(ADJACENT_DAYS_KEY, String(value));
    } catch {
      // ignore storage failures
    }

    this.setState({ showAdjacentDays: value });
  }

  nextMonthPair(): void {
    const start = this.state.mobileMonthStart;

    if (start + MONTH_PAIR_SIZE >= MONTH_NAMES.length) {
      this.setState({ mobileMonthStart: 0, mobileYear: this.state.mobileYear + 1 });
    } else {
      this.setState({ mobileMonthStart: start + MONTH_PAIR_SIZE });
    }
  }

  prevMonthPair(): void {
    const start = this.state.mobileMonthStart;

    if (start - MONTH_PAIR_SIZE < 0) {
      this.setState({
        mobileMonthStart: MONTH_NAMES.length - MONTH_PAIR_SIZE,
        mobileYear: this.state.mobileYear - 1,
      });
    } else {
      this.setState({ mobileMonthStart: start - MONTH_PAIR_SIZE });
    }
  }

  goToToday(): void {
    this.setState({
      mobileYear: new Date().getFullYear(),
      mobileMonthStart: currentMonthPair(),
      year: new Date().getFullYear(),
    });
  }

  toggleSidebar(): void {
    this.setState({ sidebarOpen: !this.state.sidebarOpen });
  }

  closeSidebar(): void {
    this.setState({ sidebarOpen: false });
  }

  get selectedCategory(): Category | null {
    const id = this.state.selectedCategoryId;
    return id ? this.state.session.categories.find((category) => category.id === id) ?? null : null;
  }

  selectCategory(categoryId: string | null): void {
    this.setState({
      selectedCategoryId: this.state.selectedCategoryId === categoryId ? null : categoryId,
      sidebarOpen: this.state.viewport.isMobile ? false : this.state.sidebarOpen,
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      this.setState({ busy: true });
      await signInWithEmail(email, password);
      await this.refreshUser();
      this.setState({ showAuthDialog: false });
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async signUp(email: string, password: string, name?: string): Promise<void> {
    try {
      this.setState({ busy: true });
      await signUpWithEmail(email, password, name);
      await this.refreshUser();
      this.setState({ showAuthDialog: false });
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async signOut(): Promise<void> {
    try {
      this.setState({ busy: true });
      await signOutUser();
      sessionStore.setLocalUser(null);
      await this.refreshUser();
      this.setHash(null);
      await this.loadLocalCalendar();
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async openSession(id: string): Promise<void> {
    try {
      this.setState({ busy: true, error: null });
      const { session, accessLevel } = await api.getSession(id);
      await sessionStore.connect(id, {
        readOnly: accessLevel === 'viewer',
        token: loadSessionToken(id),
      });
      this.setHash(id);
      this.setState({
        sessionName: session.name,
        isAnonymous: session.isAnonymous,
        accessLevel,
      });
      await this.seedDefaultsIfEmpty();
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async listSessions(): Promise<SessionSummary[]> {
    const { sessions } = await api.listSessions();
    return sessions;
  }

  async createSession(name = 'New Calendar'): Promise<void> {
    try {
      this.setState({ busy: true, error: null });
      const { session } = await api.createSession(name);
      await this.openSession(session.id);
      this.setState({ showSessionList: false });
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async newCalendar(): Promise<void> {
    if (this.state.user) {
      await this.createSession('New Calendar');
      return;
    }

    try {
      this.setState({ busy: true, error: null });
      this.setHash(null);
      await sessionStore.resetLocal();
      this.setState({
        sessionName: 'Untitled Calendar',
        isAnonymous: true,
        accessLevel: null,
        selectedCategoryId: null,
        notice: 'New calendar',
      });
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async renameSession(name: string): Promise<void> {
    const id = this.state.session.sessionId;

    if (!id) {
      this.setState({ sessionName: name });
      return;
    }

    try {
      await api.renameSession(id, name);
      this.setState({ sessionName: name });
    } catch (error) {
      this.setError(error);
    }
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await api.deleteSession(id);

      if (id === this.state.session.sessionId) {
        this.setHash(null);
        await this.loadLocalCalendar();
      }
    } catch (error) {
      this.setError(error);
    }
  }

  async save(): Promise<void> {
    try {
      this.setState({ busy: true, error: null });
      const snapshot = sessionStore.getSnapshot();
      const currentId = this.state.session.sessionId;
      let id = currentId;

      if (!id) {
        const { session } = await api.createSession(this.state.sessionName);
        id = session.id;
      }

      await api.putState(id, snapshot);
      this.setHash(id);
      this.setState({ notice: 'Saved' });

      if (id !== currentId) {
        await this.openSession(id);
      }
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async claim(): Promise<void> {
    const id = this.state.session.sessionId;

    if (!id || !this.state.user) {
      return;
    }

    try {
      this.setState({ busy: true });
      await api.claimSession(id);
      this.setState({ isAnonymous: false, accessLevel: 'owner', notice: 'Saved to your account' });
    } catch (error) {
      this.setError(error);
    } finally {
      this.setState({ busy: false });
    }
  }

  async share(email: string, accessLevel: Exclude<AccessLevel, 'owner'>): Promise<boolean> {
    const id = this.state.shareSessionId;

    if (!id) {
      return false;
    }

    try {
      await api.shareSession(id, email, accessLevel);
      this.setState({ notice: `Shared with ${email}` });
      return true;
    } catch (error) {
      this.setError(error);
      return false;
    }
  }

  toggleDateCategory(date: string, categoryId: string): void {
    sessionStore.toggleDateCategory(date, categoryId);
  }

  toggleTextCategory(date: string, categoryId: string): void {
    sessionStore.toggleTextCategory(date, categoryId);
  }

  addCategory(type: CategoryType): void {
    const categories = this.state.session.categories.filter((category) => category.type === type);
    const usedColors = this.state.session.categories.map((category) => category.color);
    const color = PALETTE.find((candidate) => !usedColors.includes(candidate)) ?? PALETTE[0];

    sessionStore.upsertCategory({
      id: createId(),
      type,
      label: type === 'foreground' ? 'New Category' : 'New Label',
      color,
      order: categories.length,
      active: true,
      visible: true,
    });
  }

  updateCategory(id: string, patch: Partial<Category>): void {
    const category = this.state.session.categories.find((item) => item.id === id);

    if (category) {
      sessionStore.upsertCategory({ ...category, ...patch });
    }
  }

  deleteCategory(id: string): void {
    sessionStore.removeCategory(id);
  }
}

export const appStore = new AppStore();
