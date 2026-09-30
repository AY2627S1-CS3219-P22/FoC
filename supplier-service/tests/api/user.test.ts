/*

Ordinary user tests
- The read endpoints are public, so these requests carry no token at all

1. GET supplier
- Test: Supplier get | Expected 200 
- Test: Supplier get on false id | Expected 404
- Test: Supplier get on non-numeric id | Expected 400

2. GET Suppliers
- Test: Get all suppliers | Expected 200
- Test: Get all suppliers on empty data | Expected 200

3. GET Suppliers Search
- Test: Supplier Search on Text | Expected 200 
- Test: Supplier search on non-existing text | Expected 200

4. GET Suppliers Category
- Test: Supplier Filter on Text | Expected 200 
- Test: Supplier filter on non-existing category | Expected 400

The docblock originally expected 404 for an unknown category. It is a 400:
filterSuppliersByCategory runs SUPPLIER_CATEGORY.parse on the query, so a
category outside the enum is a malformed request rather than a missing
resource. A valid category that nobody is in is a 200 with an empty list.

The write section is it.todo until the router calls authenticate and requireRole.
*/

import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { app } from '@/app';
import pool from '@database/db';
import { resetDatabase, truncateSuppliers } from '../helpers/reset-database';

beforeAll(async () => {
  await resetDatabase();
});

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});

describe('GET /supplier/:id as an anonymous user', () => {
  it('returns the supplier without a token', async () => {
    const res = await request(app).get('/supplier/2');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ supplierId: 2, name: 'Central Print Shop' });
  });

  it('returns 404 for an id that does not exist', async () => {
    const res = await request(app).get('/supplier/9999');

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/supplier/abc');

    expect(res.status).toBe(400);
  });
});

describe('GET /suppliers as an anonymous user', () => {
  it('lists the active suppliers', async () => {
    const res = await request(app).get('/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  //an empty catalogue is still a successful read, not a 404
  it('returns 200 and an empty list when there are no suppliers at all', async () => {
    await truncateSuppliers();

    const res = await request(app).get('/suppliers');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /suppliers/search as an anonymous user', () => {
  it('returns the matching suppliers', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'print' });

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.name)).toEqual(['Central Print Shop']);
  });

  it('returns 200 and an empty list when the text matches nothing', async () => {
    const res = await request(app).get('/suppliers/search').query({ q: 'zzzznomatch' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  //searchSuppliers defaults a missing q to '', and the function filters those out
  it('returns 200 and an empty list when q is missing', async () => {
    const res = await request(app).get('/suppliers/search');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /suppliers/category as an anonymous user', () => {
  it('returns the suppliers in the category', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'food' });

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.name)).toEqual(['The Coffee Roaster']);
  });

  it('returns 200 and an empty list for a category nobody is in', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'other' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('returns 400 for a category outside the enum', async () => {
    const res = await request(app).get('/suppliers/category').query({ type: 'spaceship' });

    expect(res.status).toBe(400);
  });
});

/*
An authenticated but non-admin caller is the case requireRole('ADMIN') exists
for: the token verifies, so this is a permission failure rather than a failure
to identify the caller. Todos until that middleware is on the write routes.
*/
describe('write routes reject a non-admin user', () => {
  it.todo('rejects POST');
  it.todo('rejects PUT');
  it.todo('rejects DELETE');
  it.todo('leaves the data untouched after a rejected write');
});
