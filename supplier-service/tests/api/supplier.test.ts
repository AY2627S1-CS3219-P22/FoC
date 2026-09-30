/*
API-level integration tests. These run against the Supabase Postgres container
started in tests/global-setup.ts, driving the real express app through supertest
so routing, validation, the repository and the error handler are all exercised.

Endpoint behaviour only. Who is allowed to call what is covered by admin.test.ts
and user.test.ts; the writes here carry an admin token so they keep working once
the router wires up authenticate.
*/

import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '@/app';
import pool from '@database/db';
import { resetDatabase } from '../helpers/reset-database';
import { adminBearer } from '../helpers/auth-token';

const newSupplier1 = {
  name: '[Test Supplier] Noodle Bar',
  type: 'food',
  buildingName: 'COM1',
  locationDescription: 'Basement canteen, stall 4',
  floor: 1,
  //numeric columns round-trip as strings through pg
  latitude: '1.294900',
  longitude: '103.774500',
};

beforeAll(async () => {
  await resetDatabase();
});

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

//Test one get all suppliers that are not soft deleted
describe('GET /suppliers', () => {
  it('returns only the suppliers that are not soft deleted', async () => {
    const res = await request(app).get('/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    //getAllSuppliersService has no ORDER BY, so compare as a set
    expect(res.body.data.map((s: any) => s.name).sort()).toEqual([
      'Central Print Shop',
      'The Coffee Roaster',
    ]);
  });

  it('never exposes the deletedAt column', async () => {
    const res = await request(app).get('/suppliers');

    expect(res.body.data[0]).not.toHaveProperty('deletedAt');
  });
});

//Test two:  Get supplier id 1 from seed.sql which is Coffee Roaster
describe('GET /supplier/:id', () => {
  it('returns the requested supplier', async () => {
    const res = await request(app).get('/supplier/1');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      supplierId: 1,
      name: 'The Coffee Roaster',
      buildingName: 'COM3',
    });
  });

  it('never exposes the deletedAt column', async () => {
    const res = await request(app).get('/supplier/1');

    expect(res.body.data).not.toHaveProperty('deletedAt');
  });

  //supplier 3 in seed.sql is soft deleted, so it has to look like it is gone
  it('returns 404 for a soft deleted supplier', async () => {
    const res = await request(app).get('/supplier/3');

    expect(res.status).toBe(404);
    expect(res.body.data).toBeUndefined();
  });

  it('returns 404 for an id that was never used', async () => {
    const res = await request(app).get('/supplier/9999');

    expect(res.status).toBe(404);
  });

  //a non-numeric id is a malformed request, not a missing supplier
  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/supplier/abc');

    expect(res.status).toBe(400);
  });
});

//sends new supplier. expect response 201
describe('POST /supplier', () => {
  it('creates a supplier and returns it', async () => {
    const res = await request(app)
      .post('/supplier')
      .set('Authorization', adminBearer())
      .send(newSupplier1);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: newSupplier1.name, buildingName: 'COM1' });
    //identity sequence was moved past the seeded ids by seed.sql
    expect(res.body.data.supplierId).toBeGreaterThan(3);
  });

  //ensure the same supplier is not created twice...
  it('persists the new supplier', async () => {
    await request(app).post('/supplier').set('Authorization', adminBearer()).send(newSupplier1);

    const res = await request(app).get('/suppliers');
    expect(res.body.data).toHaveLength(3);
  });

  it('rejects a payload that is missing required fields', async () => {
    const res = await request(app)
      .post('/supplier')
      .set('Authorization', adminBearer())
      .send({ name: 'Nameless' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Bad Request: Validation failed');
  });

  it('rejects a duplicate active supplier name with 409', async () => {
    const res = await request(app)
      .post('/supplier')
      .set('Authorization', adminBearer())
      .send({ ...newSupplier1, name: 'The Coffee Roaster' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  //the unique index is partial, so a soft deleted name is free to reuse
  it('allows reusing the name of a soft deleted supplier', async () => {
    const res = await request(app)
      .post('/supplier')
      .set('Authorization', adminBearer())
      .send({ ...newSupplier1, name: 'Campus Bookstore' });

    expect(res.status).toBe(201);
  });
});

//update successful with partial fields
describe('PUT /supplier/:id', () => {
  it('updates a supplier when expectedUpdatedAt matches', async () => {
    const current = await request(app).get('/supplier/1');

    const res = await request(app)
      .put('/supplier/1')
      .set('Authorization', adminBearer())
      .send({ buildingName: 'COM2', expectedUpdatedAt: current.body.data.updatedAt });

    expect(res.status).toBe(200);
    expect(res.body.data.buildingName).toBe('COM2');
    expect(res.body.data.updatedAt).not.toBe(current.body.data.updatedAt);
  });

  it('returns 409 when the row changed since it was read', async () => {
    const stale = new Date('2020-01-01T00:00:00.000Z').toISOString();

    const res = await request(app)
      .put('/supplier/1')
      .set('Authorization', adminBearer())
      .send({ buildingName: 'COM2', expectedUpdatedAt: stale });

    expect(res.status).toBe(409);
  });

  /*
  Optimistic concurrency: both writers read the same updated_at and fire at once.
  The first write moves updated_at, so the second no longer matches any row.
  */
  it('lets only one of two concurrent updates win', async () => {
    const current = await request(app).get('/supplier/1');
    const expectedUpdatedAt = current.body.data.updatedAt;

    const [first, second] = await Promise.all([
      request(app)
        .put('/supplier/1')
        .set('Authorization', adminBearer())
        .send({ buildingName: 'COM2', expectedUpdatedAt }),
      request(app)
        .put('/supplier/1')
        .set('Authorization', adminBearer())
        .send({ buildingName: 'COM4', expectedUpdatedAt }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
  });

  //update for a supplier that doesn't exist
  it('returns 404 for a supplier that does not exist', async () => {
    const res = await request(app)
      .put('/supplier/9999')
      .set('Authorization', adminBearer())
      .send({ buildingName: 'COM2', expectedUpdatedAt: new Date().toISOString() });

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app)
      .put('/supplier/abc')
      .set('Authorization', adminBearer())
      .send({ buildingName: 'COM2', expectedUpdatedAt: new Date().toISOString() });

    expect(res.status).toBe(400);
  });

  it('returns 400 when expectedUpdatedAt is missing', async () => {
    const res = await request(app)
      .put('/supplier/1')
      .set('Authorization', adminBearer())
      .send({ buildingName: 'COM2' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /supplier/:id', () => {
  it('soft deletes the supplier', async () => {
    const res = await request(app).delete('/supplier/1').set('Authorization', adminBearer());
    expect(res.status).toBe(200);

    const remaining = await request(app).get('/suppliers');
    expect(remaining.body.data).toHaveLength(1);

    //the row is still there, just flagged
    const { rows } = await pool.query(
      'SELECT deleted_at FROM public."Supplier_Database" WHERE id = 1',
    );
    expect(rows[0].deleted_at).not.toBeNull();
  });

  it('returns 404 when the supplier is already deleted', async () => {
    const res = await request(app).delete('/supplier/3').set('Authorization', adminBearer());

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).delete('/supplier/abc').set('Authorization', adminBearer());

    expect(res.status).toBe(400);
  });
});

/*
seed.sql never fills "Location Description", so it defaults to '' and the fts
vector on the seeded rows only covers Name and Building.
*/
describe('GET /suppliers/search', () => {
  it('matches on the name', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'coffee' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('The Coffee Roaster');
  });

  it('matches on the building', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'AS8' });

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.name)).toEqual(['Central Print Shop']);
  });

  it('returns the same camelCase shape as the rest of the API', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'coffee' });

    expect(res.body.data[0]).toMatchObject({
      supplierId: 1,
      name: 'The Coffee Roaster',
      buildingName: 'COM3',
      locationDescription: expect.any(String),
    });
    expect(res.body.data[0]).not.toHaveProperty('Name');
  });

  //an empty result is a successful query, not a missing resource
  it('returns an empty list when nothing matches', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'zzzznomatch' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('never returns a soft deleted supplier', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'bookstore' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  //the search term is a bind parameter, so quotes must not break out of the statement
  it('treats a quote-heavy search term as text', async () => {
    const res = await request(app)
      .get('/suppliers/search')
      .query({ q: "'); drop table public.\"Supplier_Database\"; --" });

    expect(res.status).toBe(200);

    const stillThere = await request(app).get('/suppliers');
    expect(stillThere.body.data).toHaveLength(2);
  });
});

describe('GET /suppliers/category', () => {
  it('filters by supplier category', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'printing' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Central Print Shop');
  });

  //a category nobody is in is still a valid question with an empty answer
  it('returns an empty list for a category with no suppliers', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'shopping' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('rejects a category outside the enum', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'spaceship' });

    expect(res.status).toBe(400);
  });
});
