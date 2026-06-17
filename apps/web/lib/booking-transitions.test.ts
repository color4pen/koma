import { describe, expect, it } from 'vitest';

import { allowedTransitions, transitionLabel } from './booking-transitions';

describe('allowedTransitions', () => {
  it('pending → [confirmed, cancelled]', () => {
    expect(allowedTransitions('pending')).toEqual(['confirmed', 'cancelled']);
  });

  it('confirmed → [cancelled, completed, no-show]', () => {
    expect(allowedTransitions('confirmed')).toEqual(['cancelled', 'completed', 'no-show']);
  });

  it('cancelled → []', () => {
    expect(allowedTransitions('cancelled')).toEqual([]);
  });

  it('completed → []', () => {
    expect(allowedTransitions('completed')).toEqual([]);
  });

  it('no-show → []', () => {
    expect(allowedTransitions('no-show')).toEqual([]);
  });
});

describe('transitionLabel', () => {
  it('confirmed → 確定', () => {
    expect(transitionLabel('confirmed')).toBe('確定');
  });

  it('cancelled → キャンセル', () => {
    expect(transitionLabel('cancelled')).toBe('キャンセル');
  });

  it('completed → 完了', () => {
    expect(transitionLabel('completed')).toBe('完了');
  });

  it('no-show → 来店なし', () => {
    expect(transitionLabel('no-show')).toBe('来店なし');
  });

  it('pending → 保留', () => {
    expect(transitionLabel('pending')).toBe('保留');
  });
});
