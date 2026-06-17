import {
  getBookingRepository,
  getCustomerRepository,
  getResourceRepository,
  getServiceRepository,
} from '@/lib/composition-root';
import { transitionLabel } from '@/lib/booking-transitions';

import BookingForm from './booking-form';
import BookingStatusActions from './booking-status-actions';

export default async function BookingsPage() {
  const bookingRepo = getBookingRepository();
  const customerRepo = getCustomerRepository();
  const serviceRepo = getServiceRepository();
  const resourceRepo = getResourceRepository();

  const [bookings, customers, services, resources] = await Promise.all([
    bookingRepo.list(),
    customerRepo.list(),
    serviceRepo.list(),
    resourceRepo.list(),
  ]);

  const customerMap = new Map(customers.map((c) => [c.id, c]));
  const serviceMap = new Map(services.map((s) => [s.id, s]));
  const resourceMap = new Map(resources.map((r) => [r.id, r]));

  const customerOptions = customers.map((c) => ({ id: c.id, name: c.name }));
  const serviceOptions = services.map((s) => ({ id: s.id, name: s.name }));
  const resourceOptions = resources.map((r) => ({ id: r.id, name: r.name }));

  return (
    <main>
      <h1>予約管理</h1>

      <BookingForm
        customers={customerOptions}
        services={serviceOptions}
        resources={resourceOptions}
      />

      <section>
        <h2>予約一覧</h2>
        {bookings.length === 0 ? (
          <p>予約がありません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>顧客</th>
                <th>サービス</th>
                <th>リソース</th>
                <th>開始日時</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{customerMap.get(booking.customerId)?.name ?? '不明'}</td>
                  <td>{serviceMap.get(booking.serviceId)?.name ?? '不明'}</td>
                  <td>{resourceMap.get(booking.resourceId)?.name ?? '不明'}</td>
                  <td>{new Date(booking.slot.start).toLocaleString('ja-JP')}</td>
                  <td>{transitionLabel(booking.status)}</td>
                  <td>
                    <BookingStatusActions bookingId={booking.id} status={booking.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
