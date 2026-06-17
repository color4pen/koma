import { eq } from 'drizzle-orm';
import {
  type ResourceRepository,
  type Resource,
  createResource,
} from '@koma/resource';
import { parseId } from '@koma/shared';
import { resources } from './schema/resource.js';
import { type DrizzleClient } from './client.js';

function rowToResource(row: typeof resources.$inferSelect): Resource {
  return createResource({
    id: parseId<'Resource'>(row.id),
    name: row.name,
    kind: row.kind,
    capacity: row.capacity,
  });
}

export function createDrizzleResourceRepository(
  db: DrizzleClient,
): ResourceRepository {
  return {
    async save(resource: Resource): Promise<void> {
      await db
        .insert(resources)
        .values({
          id: resource.id,
          name: resource.name,
          kind: resource.kind,
          capacity: resource.capacity,
        })
        .onConflictDoUpdate({
          target: resources.id,
          set: {
            name: resource.name,
            kind: resource.kind,
            capacity: resource.capacity,
          },
        });
    },

    async findById(id): Promise<Resource | null> {
      const rows = await db
        .select()
        .from(resources)
        .where(eq(resources.id, id));
      const row = rows[0];
      if (!row) return null;
      return rowToResource(row);
    },

    async list(): Promise<Resource[]> {
      const rows = await db.select().from(resources);
      return rows.map(rowToResource);
    },
  };
}
