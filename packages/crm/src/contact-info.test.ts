import { describe, it, expect } from 'vitest';
import { createContactInfo } from './contact-info.js';

describe('createContactInfo', () => {
  it('電話のみで構築できる', () => {
    const contact = createContactInfo({ phone: '090-1234-5678' });
    expect(contact.phone).toBe('090-1234-5678');
    expect(contact.email).toBeNull();
  });

  it('メールのみで構築できる', () => {
    const contact = createContactInfo({ email: 'test@example.com' });
    expect(contact.phone).toBeNull();
    expect(contact.email).toBe('test@example.com');
  });

  it('電話とメールの両方で構築できる', () => {
    const contact = createContactInfo({
      phone: '090-1234-5678',
      email: 'test@example.com',
    });
    expect(contact.phone).toBe('090-1234-5678');
    expect(contact.email).toBe('test@example.com');
  });

  it('両方 null で構築するとエラーになる', () => {
    expect(() => createContactInfo({ phone: null, email: null })).toThrow();
  });

  it('両方 undefined で構築するとエラーになる', () => {
    expect(() => createContactInfo({})).toThrow();
  });

  it('両方空文字で構築するとエラーになる（空文字は null 扱い）', () => {
    expect(() => createContactInfo({ phone: '', email: '' })).toThrow();
  });

  it('ContactInfo が frozen（プロパティ書き換え不可）である', () => {
    const contact = createContactInfo({ phone: '090-1234-5678' });
    expect(Object.isFrozen(contact)).toBe(true);
  });
});
