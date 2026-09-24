import { afterAll, describe, expect, it } from "vitest";

import pool from "../../src/database/db";

describe("Supabase database", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("connects to PostgreSQL", async () => {
    const result = await pool.query<{ value: number }>("SELECT 1 AS value");

    expect(result.rows[0]?.value).toBe(1);
  });

  it("can read from Supplier_Database", async () => {
    const result = await pool.query(
      'SELECT * FROM "Supplier_Database" LIMIT 1',
    );

    expect(Array.isArray(result.rows)).toBe(true);
  });
});
