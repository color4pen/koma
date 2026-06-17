import { pgTable, text, integer, jsonb } from 'drizzle-orm/pg-core';

export const services = pgTable('services', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  duration_ms: integer('duration_ms').notNull(),
  price_amount: integer('price_amount').notNull(),
  price_currency: text('price_currency').notNull(),
  resource_kinds: jsonb('resource_kinds').notNull(),
});

export type ServiceRow = typeof services.$inferSelect;
