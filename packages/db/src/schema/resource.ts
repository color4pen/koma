import { pgTable, text, integer } from 'drizzle-orm/pg-core';

export const resources = pgTable('resources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  capacity: integer('capacity').notNull(),
});

export type ResourceRow = typeof resources.$inferSelect;
