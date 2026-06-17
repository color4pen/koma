import { toMinutes } from '@koma/shared';

import { getServiceRepository } from '@/lib/composition-root';

import ServiceForm from './service-form';

export default async function ServicesPage() {
  const repo = getServiceRepository();
  const services = await repo.list();

  return (
    <main>
      <h1>サービス管理</h1>

      <ServiceForm />

      <section>
        <h2>サービス一覧</h2>
        {services.length === 0 ? (
          <p>サービスがありません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>メニュー名</th>
                <th>所要時間</th>
                <th>料金</th>
                <th>対応リソース種別</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{toMinutes(service.duration)}分</td>
                  <td>{service.price.amount.toLocaleString('ja-JP')}円</td>
                  <td>{service.resourceKinds.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
