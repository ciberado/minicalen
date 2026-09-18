import { describe, expect, it } from 'vitest';
import { generateSymbol } from './symbols';

describe('generateSymbol', () => {
  it('uses the first uppercase letters of the label', () => {
    expect(generateSymbol('Holiday Trip')).toBe('HT');
    expect(generateSymbol('Holiday')).toBe('H');
    expect(generateSymbol('Work')).toBe('W');
  });

  it('falls back to the first character when there are no uppercase letters', () => {
    expect(generateSymbol('deadline')).toBe('D');
    expect(generateSymbol('vacaciones')).toBe('V');
  });

  it('handles empty labels', () => {
    expect(generateSymbol('')).toBe('');
  });
});
