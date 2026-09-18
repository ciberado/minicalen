import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import {
  SCHEMA_VERSION,
  applySnapshot,
  createSessionDocument,
  getCategories,
  getDateMark,
  getDateMarks,
  removeCategory,
  setCategoryOrder,
  setDateCategory,
  snapshotFromDoc,
  toggleDateTextCategory,
  upsertCategory,
  type Category,
  type DateMark,
  type DateMarkMap,
  type SessionDocument,
  type SessionSnapshot,
} from '@minicalen/shared';
import { COLLAB_URL } from '../env';

export type SyncStatus = 'local' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SessionViewState {
  sessionId: string | null;
  categories: Category[];
  dateMarks: DateMarkMap;
  status: SyncStatus;
  readOnly: boolean;
}

type Listener = () => void;

const EMPTY_SNAPSHOT: SessionSnapshot = {
  schemaVersion: SCHEMA_VERSION,
  categories: [],
  dateMarks: {},
};

export class SessionStore {
  private readonly doc = new Y.Doc();
  private readonly session: SessionDocument;
  private readonly listeners = new Set<Listener>();
  private indexeddb: IndexeddbPersistence | null = null;
  private provider: HocuspocusProvider | null = null;

  private state: SessionViewState = {
    sessionId: null,
    categories: [],
    dateMarks: {},
    status: 'local',
    readOnly: false,
  };

  constructor() {
    this.session = createSessionDocument(this.doc);
    this.session.categories.observe(() => this.refresh());
    this.session.dateMarks.observe(() => this.refresh());
    this.refresh();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SessionViewState {
    return this.state;
  }

  getSnapshot(): SessionSnapshot {
    return snapshotFromDoc(this.session);
  }

  getDateMark(date: string): DateMark | undefined {
    return getDateMark(this.session, date);
  }

  async loadLocal(): Promise<void> {
    this.teardown();
    this.resetDocument();
    this.indexeddb = new IndexeddbPersistence('minicalen-anonymous', this.doc);
    await this.indexeddb.whenSynced;
    this.setState({ sessionId: null, status: 'local', readOnly: false });
  }

  async connect(
    sessionId: string,
    options: { readOnly?: boolean; token?: string | null } = {},
  ): Promise<void> {
    this.teardown();
    this.resetDocument();
    this.setState({ sessionId, status: 'connecting', readOnly: options.readOnly ?? false });

    this.indexeddb = new IndexeddbPersistence(`minicalen-${sessionId}`, this.doc);
    await this.indexeddb.whenSynced;

    this.provider = new HocuspocusProvider({
      url: COLLAB_URL,
      name: sessionId,
      document: this.doc,
      token: options.token ?? null,
      onStatus: ({ status }) => {
        this.setState({
          status: status === 'connected' ? 'connected' : 'disconnected',
        });
      },
      onAuthenticationFailed: () => this.setState({ status: 'error' }),
      onAuthenticated: ({ scope }) => this.setState({ readOnly: scope === 'readonly' }),
    });
  }

  async applyRemoteSnapshot(snapshot: SessionSnapshot): Promise<void> {
    applySnapshot(this.session, snapshot);
    this.refresh();
  }

  setDateCategory(date: string, categoryId: string | null): void {
    if (this.state.readOnly) {
      return;
    }

    setDateCategory(this.session, date, categoryId);
  }

  toggleTextCategory(date: string, textCategoryId: string): void {
    if (this.state.readOnly) {
      return;
    }

    toggleDateTextCategory(this.session, date, textCategoryId);
  }

  upsertCategory(category: Category): void {
    if (this.state.readOnly) {
      return;
    }

    upsertCategory(this.session, category);
  }

  removeCategory(categoryId: string): void {
    if (this.state.readOnly) {
      return;
    }

    removeCategory(this.session, categoryId);
  }

  reorderCategories(orderedIds: string[]): void {
    if (this.state.readOnly) {
      return;
    }

    setCategoryOrder(this.session, orderedIds);
  }

  destroy(): void {
    this.teardown();
  }

  private teardown(): void {
    this.provider?.destroy();
    this.provider = null;
    this.indexeddb?.destroy();
    this.indexeddb = null;
  }

  private resetDocument(): void {
    applySnapshot(this.session, EMPTY_SNAPSHOT);
    this.refresh();
  }

  private refresh(): void {
    this.state = {
      ...this.state,
      categories: getCategories(this.session),
      dateMarks: getDateMarks(this.session),
    };
    this.emit();
  }

  private setState(patch: Partial<SessionViewState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const sessionStore = new SessionStore();
