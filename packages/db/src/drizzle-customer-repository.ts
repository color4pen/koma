import { eq } from 'drizzle-orm';
import {
  type CustomerRepository,
  type Customer,
  type CustomFieldValue,
  createContactInfo,
  createCustomer,
} from '@koma/crm';
import { parseId } from '@koma/shared';
import { customers } from './schema/customer.js';
import { type DrizzleClient } from './client.js';

function rowToCustomer(row: typeof customers.$inferSelect): Customer {
  const contact = createContactInfo({
    phone: row.phone ?? null,
    email: row.email ?? null,
  });

  return createCustomer({
    id: parseId<'Customer'>(row.id),
    name: row.name,
    contact,
    tags: (row.tags as string[]) ?? [],
    notes: row.notes,
    customFields: (row.custom_fields as Record<string, CustomFieldValue>) ?? {},
  });
}

export function createDrizzleCustomerRepository(
  db: DrizzleClient,
): CustomerRepository {
  return {
    async save(customer: Customer): Promise<void> {
      await db
        .insert(customers)
        .values({
          id: customer.id,
          name: customer.name,
          phone: customer.contact.phone,
          email: customer.contact.email,
          tags: [...customer.tags],
          notes: customer.notes,
          custom_fields: { ...customer.customFields },
        })
        .onConflictDoUpdate({
          target: customers.id,
          set: {
            name: customer.name,
            phone: customer.contact.phone,
            email: customer.contact.email,
            tags: [...customer.tags],
            notes: customer.notes,
            custom_fields: { ...customer.customFields },
          },
        });
    },

    async findById(id): Promise<Customer | null> {
      const rows = await db
        .select()
        .from(customers)
        .where(eq(customers.id, id));
      const row = rows[0];
      if (!row) return null;
      return rowToCustomer(row);
    },

    async list(): Promise<Customer[]> {
      const rows = await db.select().from(customers);
      return rows.map(rowToCustomer);
    },
  };
}
