import { describe, it, expect } from 'vitest';
import { isActive, isTerminal, type BookingStatus } from './booking-status.js';

const ALL_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no-show',
];

describe('isActive', () => {
  it('pending は active である', () => {
    expect(isActive('pending')).toBe(true);
  });

  it('confirmed は active である', () => {
    expect(isActive('confirmed')).toBe(true);
  });

  it('cancelled は active でない', () => {
    expect(isActive('cancelled')).toBe(false);
  });

  it('completed は active でない', () => {
    expect(isActive('completed')).toBe(false);
  });

  it('no-show は active でない', () => {
    expect(isActive('no-show')).toBe(false);
  });
});

describe('isTerminal', () => {
  it('pending は terminal でない', () => {
    expect(isTerminal('pending')).toBe(false);
  });

  it('confirmed は terminal でない', () => {
    expect(isTerminal('confirmed')).toBe(false);
  });

  it('cancelled は terminal である', () => {
    expect(isTerminal('cancelled')).toBe(true);
  });

  it('completed は terminal である', () => {
    expect(isTerminal('completed')).toBe(true);
  });

  it('no-show は terminal である', () => {
    expect(isTerminal('no-show')).toBe(true);
  });
});

describe('isActive と isTerminal の相互排他性', () => {
  it('全ての status で isActive と isTerminal が相互排他である', () => {
    for (const status of ALL_STATUSES) {
      expect(isActive(status) && isTerminal(status)).toBe(false);
    }
  });

  it('全ての status で isActive または isTerminal のどちらかが true である', () => {
    for (const status of ALL_STATUSES) {
      expect(isActive(status) || isTerminal(status)).toBe(true);
    }
  });
});
