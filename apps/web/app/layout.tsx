import Link from 'next/link';
import type { Metadata } from 'next';

import { resolveAuthConfig } from '@/lib/auth-config';
import { readSession } from '@/lib/session-cookie';
import { logoutAction } from '@/app/login/actions';

export const metadata: Metadata = {
  title: 'Koma',
  description: '予約・顧客管理パッケージ',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  const adminEmail = session
    ? resolveAuthConfig(process.env as Record<string, string | undefined>).adminEmail
    : null;

  return (
    <html lang="ja">
      <body>
        <header
          style={{
            background: '#1a1a2e',
            color: '#fff',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          <Link
            href="/"
            style={{
              color: '#e2e8f0',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '1.25rem',
            }}
          >
            Koma
          </Link>
          {session && (
            <>
              <nav style={{ display: 'flex', gap: '1.5rem' }}>
                <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  ホーム
                </Link>
                <Link href="/customers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  顧客
                </Link>
                <Link href="/resources" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  リソース
                </Link>
                <Link href="/services" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  サービス
                </Link>
                <Link href="/bookings" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  予約
                </Link>
              </nav>
              <div
                style={{
                  marginLeft: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <span style={{ color: '#cbd5e1' }}>{adminEmail}</span>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    style={{
                      color: '#cbd5e1',
                      background: 'none',
                      border: '1px solid #cbd5e1',
                      padding: '0.25rem 0.75rem',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  >
                    ログアウト
                  </button>
                </form>
              </div>
            </>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
