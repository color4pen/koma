import { eq } from 'drizzle-orm';
import {
  type ServiceRepository,
  type Service,
  createService,
} from '@koma/catalog';
import { parseId, ofMilliseconds, createMoney, type Currency } from '@koma/shared';
import { services } from './schema/service.js';
import { type DrizzleClient } from './client.js';

function rowToService(row: typeof services.$inferSelect): Service {
  const duration = ofMilliseconds(row.duration_ms);
  const price = createMoney(row.price_amount, row.price_currency as Currency);
  return createService({
    id: parseId<'Service'>(row.id),
    name: row.name,
    duration,
    price,
    resourceKinds: row.resource_kinds as string[],
  });
}

export function createDrizzleServiceRepository(
  db: DrizzleClient,
): ServiceRepository {
  return {
    async save(service: Service): Promise<void> {
      await db
        .insert(services)
        .values({
          id: service.id,
          name: service.name,
          duration_ms: service.duration.milliseconds,
          price_amount: service.price.amount,
          price_currency: service.price.currency,
          resource_kinds: [...service.resourceKinds],
        })
        .onConflictDoUpdate({
          target: services.id,
          set: {
            name: service.name,
            duration_ms: service.duration.milliseconds,
            price_amount: service.price.amount,
            price_currency: service.price.currency,
            resource_kinds: [...service.resourceKinds],
          },
        });
    },

    async findById(id): Promise<Service | null> {
      const rows = await db
        .select()
        .from(services)
        .where(eq(services.id, id));
      const row = rows[0];
      if (!row) return null;
      return rowToService(row);
    },

    async list(): Promise<Service[]> {
      const rows = await db.select().from(services);
      return rows.map(rowToService);
    },
  };
}
