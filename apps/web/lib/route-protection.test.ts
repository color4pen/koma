import { describe, expect, it } from 'vitest';

import { isPublicPath } from './route-protection';

describe('isPublicPath', () => {
  describe('public パス', () => {
    it('/login は public', () => {
      expect(isPublicPath('/login')).toBe(true);
    });

    it('/_next/static/x.js は public', () => {
      expect(isPublicPath('/_next/static/x.js')).toBe(true);
    });

    it('/_next/image/... は public', () => {
      expect(isPublicPath('/_next/image/foo.png')).toBe(true);
    });

    it('/favicon.ico は public', () => {
      expect(isPublicPath('/favicon.ico')).toBe(true);
    });
  });

  describe('保護対象パス', () => {
    it('/customers は保護対象', () => {
      expect(isPublicPath('/customers')).toBe(false);
    });

    it('/ は保護対象', () => {
      expect(isPublicPath('/')).toBe(false);
    });

    it('/login/reset は保護対象（/login 完全一致のみ）', () => {
      expect(isPublicPath('/login/reset')).toBe(false);
    });

    it('/resources は保護対象', () => {
      expect(isPublicPath('/resources')).toBe(false);
    });

    it('/bookings は保護対象', () => {
      expect(isPublicPath('/bookings')).toBe(false);
    });
  });
});
