import { describe, it, expect } from 'vitest';
import { createCustomer, updateCustomer } from './customer.js';
import { createContactInfo } from './contact-info.js';

const contact = createContactInfo({ phone: '090-1234-5678' });

describe('createCustomer', () => {
  it('必須フィールド（name, contact）のみで構築できる', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(customer.name).toBe('山田 太郎');
    expect(customer.contact).toBe(contact);
  });

  it('id を省略したとき自動生成される', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(typeof customer.id).toBe('string');
    expect(customer.id.length).toBeGreaterThan(0);
  });

  it('tags のデフォルト値は空配列', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(customer.tags).toEqual([]);
  });

  it('notes のデフォルト値は空文字', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(customer.notes).toBe('');
  });

  it('customFields のデフォルト値は空オブジェクト', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(customer.customFields).toEqual({});
  });

  it('customFields に string / number / boolean を設定・取得できる', () => {
    const customer = createCustomer({
      name: '山田 太郎',
      contact,
      customFields: {
        memo: '常連',
        visitCount: 5,
        vip: true,
      },
    });
    expect(customer.customFields['memo']).toBe('常連');
    expect(customer.customFields['visitCount']).toBe(5);
    expect(customer.customFields['vip']).toBe(true);
  });

  it('Customer が frozen（プロパティ書き換え不可）である', () => {
    const customer = createCustomer({ name: '山田 太郎', contact });
    expect(Object.isFrozen(customer)).toBe(true);
  });

  it('tags が frozen である', () => {
    const customer = createCustomer({
      name: '山田 太郎',
      contact,
      tags: ['VIP'],
    });
    expect(Object.isFrozen(customer.tags)).toBe(true);
  });
});

describe('updateCustomer', () => {
  it('新しい Customer を返し、元の Customer は変更されない', () => {
    const original = createCustomer({ name: '山田 太郎', contact });
    const updated = updateCustomer(original, { name: '田中 花子' });
    expect(updated).not.toBe(original);
    expect(original.name).toBe('山田 太郎');
    expect(updated.name).toBe('田中 花子');
  });

  it('name を変更しても元の name が保持される', () => {
    const original = createCustomer({ name: '山田 太郎', contact });
    updateCustomer(original, { name: '田中 花子' });
    expect(original.name).toBe('山田 太郎');
  });

  it('tags を変更しても元の tags が保持される', () => {
    const original = createCustomer({
      name: '山田 太郎',
      contact,
      tags: ['VIP'],
    });
    const updated = updateCustomer(original, { tags: ['新規'] });
    expect(original.tags).toEqual(['VIP']);
    expect(updated.tags).toEqual(['新規']);
  });

  it('id を保持する（TC-015）', () => {
    const original = createCustomer({ name: '山田 太郎', contact });
    const updated = updateCustomer(original, { name: '田中 花子' });
    expect(updated.id).toBe(original.id);
  });
});
