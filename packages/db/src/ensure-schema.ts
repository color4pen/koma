import { sql } from 'drizzle-orm';
import { type DrizzleClient } from './client.js';

/**
 * 4 テーブル（customers / resources / services / bookings）を冪等に作成する。
 *
 * DDL は schema/*.ts と同期を保つこと。drizzle-kit 導入後に廃止予定。
 */
export async function ensureSchema(db: DrizzleClient): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customers (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      phone         TEXT,
      email         TEXT,
      tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes         TEXT NOT NULL DEFAULT ''::text,
      custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS resources (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      kind     TEXT NOT NULL,
      capacity INTEGER NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS services (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      duration_ms    INTEGER NOT NULL,
      price_amount   INTEGER NOT NULL,
      price_currency TEXT NOT NULL,
      resource_kinds JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id            TEXT PRIMARY KEY,
      customer_id   TEXT NOT NULL,
      service_id    TEXT NOT NULL,
      resource_id   TEXT NOT NULL,
      start_millis  BIGINT NOT NULL,
      end_millis    BIGINT NOT NULL,
      status        TEXT NOT NULL,
      custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
}
