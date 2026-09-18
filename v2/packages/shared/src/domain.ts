export type CategoryType = 'foreground' | 'text';

export interface Category {
  id: string;
  type: CategoryType;
  label: string;
  color: string;
  order: number;
  active: boolean;
  visible: boolean;
}

export interface DateMark {
  categoryId?: string;
  textCategoryIds: string[];
}

export type DateMarkMap = Record<string, DateMark>;

export interface SessionSnapshot {
  schemaVersion: number;
  categories: Category[];
  dateMarks: DateMarkMap;
}
