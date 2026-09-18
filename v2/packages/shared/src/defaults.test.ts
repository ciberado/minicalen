import { describe, expect, it } from 'vitest';
import { defaultCategories } from './defaults';

describe('defaultCategories', () => {
  it('returns the expected foreground and text categories', () => {
    const categories = defaultCategories();

    expect(categories.filter((category) => category.type === 'foreground')).toHaveLength(3);
    expect(categories.filter((category) => category.type === 'text')).toHaveLength(2);
  });

  it('uses unique ids and valid hex colors', () => {
    const categories = defaultCategories();
    const ids = categories.map((category) => category.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const category of categories) {
      expect(category.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
