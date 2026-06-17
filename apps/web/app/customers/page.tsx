import { getCustomerRepository } from '@/lib/composition-root';

import CustomerForm from './customer-form';

export default async function CustomersPage() {
  const repo = await getCustomerRepository();
  const customers = await repo.list();

  return (
    <main>
      <h1>顧客管理</h1>

      <CustomerForm />

      <section>
        <h2>顧客一覧</h2>
        {customers.length === 0 ? (
          <p>顧客がありません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>電話番号</th>
                <th>メールアドレス</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.contact.phone ?? '—'}</td>
                  <td>{customer.contact.email ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
