import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { resolveAuthConfig } from '@/lib/auth-config';
import { isPublicPath } from '@/lib/route-protection';
import { verifySession } from '@/lib/session';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

/**
 * 全ルートを保護するミドルウェア（edge runtime）。
 *
 * - public パス（/login・/_next/...・/favicon.ico）はそのまま通過。
 * - それ以外は koma_session Cookie を verifySession で検証し、
 *   不正・不在の場合は /login?next=<元パス> へリダイレクトする。
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const { sessionSecret } = resolveAuthConfig(
    process.env as Record<string, string | undefined>,
  );

  const cookie = request.cookies.get('koma_session');

  if (!cookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySession(cookie.value, sessionSecret);

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
