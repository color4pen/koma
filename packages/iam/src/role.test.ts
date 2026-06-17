import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS, can } from './role.js';

describe('can', () => {
  describe('owner', () => {
    it('returns true for all permissions', () => {
      for (const permission of ALL_PERMISSIONS) {
        expect(can('owner', permission)).toBe(true);
      }
    });
  });

  describe('staff', () => {
    it('returns false for manage-users', () => {
      expect(can('staff', 'manage-users')).toBe(false);
    });

    it('returns false for manage-settings', () => {
      expect(can('staff', 'manage-settings')).toBe(false);
    });

    it('returns true for manage-customers', () => {
      expect(can('staff', 'manage-customers')).toBe(true);
    });

    it('returns true for manage-resources', () => {
      expect(can('staff', 'manage-resources')).toBe(true);
    });

    it('returns true for manage-services', () => {
      expect(can('staff', 'manage-services')).toBe(true);
    });

    it('returns true for manage-bookings', () => {
      expect(can('staff', 'manage-bookings')).toBe(true);
    });
  });
});
