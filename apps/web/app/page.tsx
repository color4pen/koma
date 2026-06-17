import Link from 'next/link';

import { getCustomerRepository, getResourceRepository, getServiceRepository, getBookingRepository } from '@/lib/composition-root';
import { getDashboardCounts } from '@/lib/dashboard';

export default async function Home() {
  const customerRepo = getCustomerRepository();
  const resourceRepo = getResourceRepository();
  const serviceRepo = getServiceRepository();
  const bookingRepo = getBookingRepository();

  const counts = await getDashboardCounts({ customerRepo, resourceRepo, serviceRepo, bookingRepo });

  const cards = [
    { label: '顧客', count: counts.customers, href: '/customers' },
    { label: 'リソース', count: counts.resources, href: '/resources' },
    { label: 'サービス', count: counts.services, href: '/services' },
    { label: '予約', count: counts.bookings, href: '/bookings' },
  ];

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>ダッシュボード</h1>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        {cards.map((card) => (
          <div
            key={card.href}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem 2rem',
              minWidth: '160px',
              background: '#f8fafc',
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>{card.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>{card.count}</div>
            <Link href={card.href} style={{ fontSize: '0.875rem', color: '#3b82f6', textDecoration: 'none' }}>
              一覧を見る →
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
