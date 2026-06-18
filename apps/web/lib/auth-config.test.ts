import { describe, expect, it } from 'vitest';

import { resolveAuthConfig } from './auth-config.js';

const PROD_ENV = { NODE_ENV: 'production' };

describe('resolveAuthConfig', () => {
  describe('production モード', () => {
    it('全 env 指定時に AuthConfig を返す', () => {
      const config = resolveAuthConfig({
        ...PROD_ENV,
        SESSION_SECRET: 'my-secret',
        ADMIN_EMAIL: 'admin@myapp.com',
        ADMIN_PASSWORD: 'secure-pass',
      });
      expect(config).toEqual({
        sessionSecret: 'my-secret',
        adminEmail: 'admin@myapp.com',
        adminPassword: 'secure-pass',
      });
    });

    it('SESSION_SECRET 欠落時に throw する', () => {
      expect(() =>
        resolveAuthConfig({
          ...PROD_ENV,
          ADMIN_EMAIL: 'admin@myapp.com',
          ADMIN_PASSWORD: 'secure-pass',
        }),
      ).toThrow('SESSION_SECRET');
    });

    it('ADMIN_EMAIL 欠落時に throw する', () => {
      expect(() =>
        resolveAuthConfig({
          ...PROD_ENV,
          SESSION_SECRET: 'my-secret',
          ADMIN_PASSWORD: 'secure-pass',
        }),
      ).toThrow('ADMIN_EMAIL');
    });

    it('ADMIN_PASSWORD 欠落時に throw する', () => {
      expect(() =>
        resolveAuthConfig({
          ...PROD_ENV,
          SESSION_SECRET: 'my-secret',
          ADMIN_EMAIL: 'admin@myapp.com',
        }),
      ).toThrow('ADMIN_PASSWORD');
    });

    it('全 env 欠落時にすべての変数名をエラーに含める', () => {
      expect(() => resolveAuthConfig(PROD_ENV)).toThrow(
        /SESSION_SECRET.*ADMIN_EMAIL.*ADMIN_PASSWORD/,
      );
    });
  });

  describe('dev / test モード', () => {
    it('env 省略時に fallback を返す', () => {
      const config = resolveAuthConfig({});
      expect(config.sessionSecret).toBe(
        'koma-dev-session-secret-do-not-use-in-production',
      );
      expect(config.adminEmail).toBe('admin@example.com');
      expect(config.adminPassword).toBe('password');
    });

    it('NODE_ENV=test で env 省略時に fallback を返す', () => {
      const config = resolveAuthConfig({ NODE_ENV: 'test' });
      expect(config.adminEmail).toBe('admin@example.com');
    });

    it('NODE_ENV=development で env 省略時に fallback を返す', () => {
      const config = resolveAuthConfig({ NODE_ENV: 'development' });
      expect(config.adminEmail).toBe('admin@example.com');
    });

    it('一部 env 指定時はその値を優先し残りは fallback', () => {
      const config = resolveAuthConfig({
        SESSION_SECRET: 'custom-secret',
      });
      expect(config.sessionSecret).toBe('custom-secret');
      expect(config.adminEmail).toBe('admin@example.com');
      expect(config.adminPassword).toBe('password');
    });

    it('全 env 指定時はすべてカスタム値を使用する', () => {
      const config = resolveAuthConfig({
        SESSION_SECRET: 'custom-secret',
        ADMIN_EMAIL: 'custom@example.com',
        ADMIN_PASSWORD: 'custom-pass',
      });
      expect(config.sessionSecret).toBe('custom-secret');
      expect(config.adminEmail).toBe('custom@example.com');
      expect(config.adminPassword).toBe('custom-pass');
    });
  });
});
