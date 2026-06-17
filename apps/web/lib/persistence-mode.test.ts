import { describe, it, expect } from 'vitest';
import { selectPersistenceMode } from './persistence-mode.js';

describe('selectPersistenceMode', () => {
  it('DATABASE_URL が設定されている場合は drizzle を返す', () => {
    expect(selectPersistenceMode({ DATABASE_URL: 'postgresql://localhost/mydb' })).toBe('drizzle');
  });

  it('DATABASE_URL がない場合（{}）は memory を返す', () => {
    expect(selectPersistenceMode({})).toBe('memory');
  });

  it('DATABASE_URL が空文字の場合は memory を返す', () => {
    expect(selectPersistenceMode({ DATABASE_URL: '' })).toBe('memory');
  });

  it('DATABASE_URL が undefined の場合は memory を返す', () => {
    expect(selectPersistenceMode({ DATABASE_URL: undefined })).toBe('memory');
  });
});
