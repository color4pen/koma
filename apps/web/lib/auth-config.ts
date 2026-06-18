export type AuthConfig = {
  sessionSecret: string;
  adminEmail: string;
  adminPassword: string;
};

// dev 専用 fallback 値。本番環境では絶対に使用しないこと。
const DEV_SESSION_SECRET = 'koma-dev-session-secret-do-not-use-in-production';
const DEV_ADMIN_EMAIL = 'admin@example.com';
const DEV_ADMIN_PASSWORD = 'password';

/**
 * 環境変数から認証設定を解決する純関数。
 *
 * - `NODE_ENV === 'production'` の場合: SESSION_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD が
 *   すべて必須。欠落時は欠落した変数名を含むエラーを throw する。
 * - それ以外（dev / test / 未定義）: 欠落した変数には dev 専用 fallback を使用する。
 */
export function resolveAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  if (env['NODE_ENV'] === 'production') {
    const missing: string[] = [];
    if (!env['SESSION_SECRET']) missing.push('SESSION_SECRET');
    if (!env['ADMIN_EMAIL']) missing.push('ADMIN_EMAIL');
    if (!env['ADMIN_PASSWORD']) missing.push('ADMIN_PASSWORD');
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for production: ${missing.join(', ')}`,
      );
    }
    return {
      sessionSecret: env['SESSION_SECRET']!,
      adminEmail: env['ADMIN_EMAIL']!,
      adminPassword: env['ADMIN_PASSWORD']!,
    };
  }

  // dev / test / 未定義: fallback を使用（dev 専用）
  return {
    sessionSecret: env['SESSION_SECRET'] ?? DEV_SESSION_SECRET,
    adminEmail: env['ADMIN_EMAIL'] ?? DEV_ADMIN_EMAIL,
    adminPassword: env['ADMIN_PASSWORD'] ?? DEV_ADMIN_PASSWORD,
  };
}
