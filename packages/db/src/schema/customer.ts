import { pgTable, text, jsonb } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  tags: jsonb('tags').notNull(),
  notes: text('notes').notNull(),
  custom_fields: jsonb('custom_fields').notNull(),
});

export type CustomerRow = typeof customers.$inferSelect;
