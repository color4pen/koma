import { pgTable, text, bigint, jsonb } from 'drizzle-orm/pg-core';

export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  customer_id: text('customer_id').notNull(),
  service_id: text('service_id').notNull(),
  resource_id: text('resource_id').notNull(),
  start_millis: bigint('start_millis', { mode: 'number' }).notNull(),
  end_millis: bigint('end_millis', { mode: 'number' }).notNull(),
  status: text('status').notNull(),
  custom_fields: jsonb('custom_fields').notNull(),
});

export type BookingRow = typeof bookings.$inferSelect;
