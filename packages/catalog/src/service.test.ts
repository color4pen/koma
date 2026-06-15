import { describe, it, expect } from 'vitest';
import { createService, updateService } from './service.js';
import { ofMinutes, createMoney } from '@koma/shared';

const validDuration = ofMinutes(60);
const validPrice = createMoney(5000, 'JPY');

describe('createService', () => {
  it('必須フィールド（name / duration / price）のみで構築できる', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(service.name).toBe('カット');
    expect(service.duration).toBe(validDuration);
    expect(service.price).toBe(validPrice);
  });

  it('id を省略したとき自動生成される', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(typeof service.id).toBe('string');
    expect(service.id.length).toBeGreaterThan(0);
  });

  it('resourceKinds を省略したとき空配列が設定される', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(service.resourceKinds).toEqual([]);
  });

  it('resourceKinds を指定して構築できる', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
      resourceKinds: ['staff', 'chair'],
    });
    expect(service.resourceKinds).toEqual(['staff', 'chair']);
  });

  it('duration が正のとき構築に成功する', () => {
    const service = createService({
      name: 'カット',
      duration: ofMinutes(30),
      price: validPrice,
    });
    expect(service.duration.milliseconds).toBe(30 * 60_000);
  });

  it('duration が 0（ofMinutes(0)）で throw する', () => {
    expect(() =>
      createService({
        name: 'カット',
        duration: ofMinutes(0),
        price: validPrice,
      }),
    ).toThrow('duration must be positive');
  });

  it('price が非負のとき構築に成功する（0 円含む）', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: createMoney(0, 'JPY'),
    });
    expect(service.price.amount).toBe(0);
  });

  it('price が負（createMoney(-100, "JPY")）で throw する', () => {
    expect(() =>
      createService({
        name: 'カット',
        duration: validDuration,
        price: createMoney(-100, 'JPY'),
      }),
    ).toThrow('price must be non-negative');
  });

  it('返却値が frozen である', () => {
    const service = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(Object.isFrozen(service)).toBe(true);
  });
});

describe('updateService', () => {
  it('新しい Service を返し、元は変更されない（immutability）', () => {
    const original = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    const updated = updateService(original, { name: 'カット＆ブロー' });
    expect(updated).not.toBe(original);
    expect(original.name).toBe('カット');
    expect(updated.name).toBe('カット＆ブロー');
  });

  it('id を保持する', () => {
    const original = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    const updated = updateService(original, { name: 'カット＆ブロー' });
    expect(updated.id).toBe(original.id);
  });

  it('duration を不正値に更新しようとすると throw する', () => {
    const original = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(() => updateService(original, { duration: ofMinutes(0) })).toThrow(
      'duration must be positive',
    );
  });

  it('price を不正値に更新しようとすると throw する', () => {
    const original = createService({
      name: 'カット',
      duration: validDuration,
      price: validPrice,
    });
    expect(() =>
      updateService(original, { price: createMoney(-1, 'JPY') }),
    ).toThrow('price must be non-negative');
  });
});
