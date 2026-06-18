/**
 * パスが公開パス（認証不要）かどうかを判定する純関数。
 *
 * - `/login`（完全一致）: public
 * - `/_next/` で始まるパス（前方一致）: public
 * - `/favicon.ico`（完全一致）: public
 * - それ以外: 保護対象（false）
 */
export function isPublicPath(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}
