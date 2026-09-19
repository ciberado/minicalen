import * as Y from 'yjs';
import type { Category, CategoryType, DateMark, DateMarkMap, SessionSnapshot } from './domain';
import { sessionSnapshotSchema } from './schema';

export const SCHEMA_VERSION = 2;
export const MAX_FOREGROUND_CATEGORIES = 2;

export interface SessionDocument {
  doc: Y.Doc;
  categories: Y.Map<Category>;
  dateMarks: Y.Map<DateMark>;
  meta: Y.Map<unknown>;
}

export function createSessionDocument(doc: Y.Doc = new Y.Doc()): SessionDocument {
  const categories = doc.getMap<Category>('categories');
  const dateMarks = doc.getMap<DateMark>('dateMarks');
  const meta = doc.getMap<unknown>('meta');

  if (!meta.has('schemaVersion')) {
    meta.set('schemaVersion', SCHEMA_VERSION);
  }

  return { doc, categories, dateMarks, meta };
}

export function getSchemaVersion(session: SessionDocument): number {
  const value = session.meta.get('schemaVersion');
  return typeof value === 'number' ? value : SCHEMA_VERSION;
}

function normalizeMark(mark: DateMark): DateMark {
  return {
    categoryIds: mark.categoryIds ? [...mark.categoryIds] : [],
    textCategoryIds: mark.textCategoryIds ? [...mark.textCategoryIds] : [],
  };
}

export function getCategories(session: SessionDocument, type?: CategoryType): Category[] {
  const all = Array.from(session.categories.values());
  const filtered = type ? all.filter((category) => category.type === type) : all;

  return filtered
    .map((category) => ({ ...category }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

export function getCategory(session: SessionDocument, id: string): Category | undefined {
  const category = session.categories.get(id);
  return category ? { ...category } : undefined;
}

export function upsertCategory(session: SessionDocument, category: Category): void {
  session.categories.set(category.id, { ...category });
}

export function removeCategory(session: SessionDocument, id: string): void {
  session.doc.transact(() => {
    session.categories.delete(id);

    const updates: Array<[string, DateMark | null]> = [];

    session.dateMarks.forEach((mark, date) => {
      const categoryIds = mark.categoryIds ?? [];

      if (!categoryIds.includes(id) && !(mark.textCategoryIds ?? []).includes(id)) {
        return;
      }

      const nextCategoryIds = categoryIds.filter((categoryId) => categoryId !== id);
      const textCategoryIds = (mark.textCategoryIds ?? []).filter(
        (textId) => textId !== id,
      );

      updates.push([
        date,
        nextCategoryIds.length > 0 || textCategoryIds.length > 0
          ? { categoryIds: nextCategoryIds, textCategoryIds }
          : null,
      ]);
    });

    for (const [date, mark] of updates) {
      if (mark) {
        session.dateMarks.set(date, mark);
      } else {
        session.dateMarks.delete(date);
      }
    }
  });
}

export function setCategoryOrder(session: SessionDocument, orderedIds: string[]): void {
  session.doc.transact(() => {
    orderedIds.forEach((id, index) => {
      const category = session.categories.get(id);

      if (category && category.order !== index) {
        session.categories.set(id, { ...category, order: index });
      }
    });
  });
}

export function getDateMark(session: SessionDocument, date: string): DateMark | undefined {
  const mark = session.dateMarks.get(date);
  return mark ? normalizeMark(mark) : undefined;
}

export function getDateMarks(session: SessionDocument): DateMarkMap {
  const result: DateMarkMap = {};

  session.dateMarks.forEach((mark, date) => {
    result[date] = normalizeMark(mark);
  });

  return result;
}

export function toggleDateCategory(
  session: SessionDocument,
  date: string,
  categoryId: string,
): void {
  const existing = session.dateMarks.get(date);
  const current = existing?.categoryIds ?? [];
  let categoryIds: string[];

  if (current.includes(categoryId)) {
    categoryIds = current.filter((id) => id !== categoryId);
  } else if (current.length < MAX_FOREGROUND_CATEGORIES) {
    categoryIds = [...current, categoryId];
  } else {
    categoryIds = [...current.slice(1), categoryId];
  }

  const textCategoryIds = existing?.textCategoryIds ? [...existing.textCategoryIds] : [];

  if (categoryIds.length === 0 && textCategoryIds.length === 0) {
    session.dateMarks.delete(date);
    return;
  }

  session.dateMarks.set(date, { categoryIds, textCategoryIds });
}

export function toggleDateTextCategory(
  session: SessionDocument,
  date: string,
  textCategoryId: string,
): void {
  const existing = session.dateMarks.get(date);
  const current = existing?.textCategoryIds ?? [];
  const textCategoryIds = current.includes(textCategoryId)
    ? current.filter((id) => id !== textCategoryId)
    : [...current, textCategoryId];
  const categoryIds = existing?.categoryIds ? [...existing.categoryIds] : [];

  if (categoryIds.length === 0 && textCategoryIds.length === 0) {
    session.dateMarks.delete(date);
    return;
  }

  session.dateMarks.set(date, { categoryIds, textCategoryIds });
}

export function clearDateMark(session: SessionDocument, date: string): void {
  session.dateMarks.delete(date);
}

export function snapshotFromDoc(session: SessionDocument): SessionSnapshot {
  return {
    schemaVersion: getSchemaVersion(session),
    categories: getCategories(session),
    dateMarks: getDateMarks(session),
  };
}

export function applySnapshot(session: SessionDocument, snapshot: SessionSnapshot): void {
  const parsed = sessionSnapshotSchema.parse(snapshot);

  session.doc.transact(() => {
    session.categories.clear();
    session.dateMarks.clear();
    session.meta.set('schemaVersion', parsed.schemaVersion);

    for (const category of parsed.categories) {
      session.categories.set(category.id, { ...category });
    }

    for (const [date, mark] of Object.entries(parsed.dateMarks)) {
      session.dateMarks.set(date, normalizeMark(mark));
    }
  });
}

export function isEmptySnapshot(snapshot: SessionSnapshot): boolean {
  return snapshot.categories.length === 0 && Object.keys(snapshot.dateMarks).length === 0;
}

export type SessionMigration = (session: SessionDocument) => void;

interface LegacyDateMark {
  categoryId?: string;
  categoryIds?: string[];
  textCategoryIds?: string[];
}

const migrations: Record<number, SessionMigration> = {
  1: (session) => {
    session.dateMarks.forEach((mark, date) => {
      const legacy = mark as unknown as LegacyDateMark;
      const categoryIds =
        legacy.categoryIds ?? (legacy.categoryId ? [legacy.categoryId] : []);

      session.dateMarks.set(date, {
        categoryIds: categoryIds.slice(0, MAX_FOREGROUND_CATEGORIES),
        textCategoryIds: legacy.textCategoryIds ?? [],
      });
    });
  },
};

export function migrateSessionDocument(session: SessionDocument): void {
  let version = getSchemaVersion(session);

  while (version < SCHEMA_VERSION) {
    const migration = migrations[version];

    if (!migration) {
      break;
    }

    migration(session);
    version += 1;
    session.meta.set('schemaVersion', version);
  }
}
