import Link from 'next/link';
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Koma",
  description: "予約・顧客管理パッケージ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header style={{ background: '#1a1a2e', color: '#fff', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link href="/" style={{ color: '#e2e8f0', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.25rem' }}>
            Koma
          </Link>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link href="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>ホーム</Link>
            <Link href="/customers" style={{ color: '#cbd5e1', textDecoration: 'none' }}>顧客</Link>
            <Link href="/resources" style={{ color: '#cbd5e1', textDecoration: 'none' }}>リソース</Link>
            <Link href="/services" style={{ color: '#cbd5e1', textDecoration: 'none' }}>サービス</Link>
            <Link href="/bookings" style={{ color: '#cbd5e1', textDecoration: 'none' }}>予約</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
