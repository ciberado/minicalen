import type { AccessLevel, Category, CategoryType } from '@minicalen/shared';
import {
  MONTH_NAMES,
  SCHEMA_VERSION,
  createId,
  defaultCategories,
  generateSymbol,
  isEmptySnapshot,
} from '@minicalen/shared';
import { api, loadSessionToken, type SessionSummary } from '../api/client';
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

const PALETTE = [
  '#F44336',
  '#E91E63',
  '#9C27B0',
  '#673AB7',
  '#3F51B5',
  '#2196F3',
  '#00BCD4',
  '#009688',
  '#4CAF50',
  '#FF9800',
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
  viewport: ViewportState;
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
    viewport: readViewport(),
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

    const hash = window.location.hash.replace('#', '');

    if (hash) {
      await this.openSession(hash);
    } else {
      await sessionStore.loadLocal();
      await this.seedDefaultsIfEmpty();
    }

    this.setState({ ready: true });
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

  get canGoPrevMonthPair(): boolean {
    return this.state.mobileMonthStart > 0;
  }

  get canGoNextMonthPair(): boolean {
    return this.state.mobileMonthStart + MONTH_PAIR_SIZE < MONTH_NAMES.length;
  }

  nextMonthPair(): void {
    this.setState({
      mobileMonthStart: Math.min(
        this.state.mobileMonthStart + MONTH_PAIR_SIZE,
        MONTH_NAMES.length - MONTH_PAIR_SIZE,
      ),
    });
  }

  prevMonthPair(): void {
    this.setState({
      mobileMonthStart: Math.max(this.state.mobileMonthStart - MONTH_PAIR_SIZE, 0),
    });
  }

  goToToday(): void {
    this.setState({ mobileMonthStart: currentMonthPair() });
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
      window.location.hash = '';
      await sessionStore.loadLocal();
      this.setState({
        sessionName: 'Untitled Calendar',
        isAnonymous: true,
        accessLevel: null,
      });
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
      window.location.hash = id;
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
        window.location.hash = '';
        await sessionStore.loadLocal();
        this.setState({ sessionName: 'Untitled Calendar', isAnonymous: true, accessLevel: null });
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
      window.location.hash = id;
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
