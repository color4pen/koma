import { getResourceRepository } from '@/lib/composition-root';

import ResourceForm from './resource-form';

export default async function ResourcesPage() {
  const repo = await getResourceRepository();
  const resources = await repo.list();

  return (
    <main>
      <h1>リソース管理</h1>

      <ResourceForm />

      <section>
        <h2>リソース一覧</h2>
        {resources.length === 0 ? (
          <p>リソースがありません。</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>名前</th>
                <th>種別</th>
                <th>同時受付数</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td>{resource.name}</td>
                  <td>{resource.kind}</td>
                  <td>{resource.capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
