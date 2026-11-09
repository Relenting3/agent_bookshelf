import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { unlinkSync } from 'fs';
import app from '../../src/server.js';
import { initDb, closeDb, all } from '../../src/db/index.js';
import * as Shelf from '../../src/models/shelf.js';

const DB = '/tmp/test-shelves-routes.db';

beforeEach(async () => {
  await initDb(DB);
});

afterEach(() => {
  closeDb();
  try {
    unlinkSync(DB);
  } catch (e) {
    // ignore
  }
});

const ERR_REQUIRED = '<p class="error">Shelf name is required</p>';
const ERR_DUP = '<p class="error">A shelf with that name already exists</p>';
const ERR_USER = '<p class="error">User not found</p>';
const ERR_SHELF = '<p class="error">Shelf not found</p>';

const create = (userId: number, name: string) =>
  request(app).post(`/shelves/user/${userId}`).type('form').send({ name });
const rename = (id: number, name: string) =>
  request(app).patch(`/shelves/${id}`).type('form').send({ name });
const del = (id: number) => request(app).delete(`/shelves/${id}`);
const count = (userId: number) => Shelf.getShelvesByUserId(userId).length;
const shelfBookCount = (shelfId: number) =>
  (all('SELECT COUNT(*) as c FROM shelf_books WHERE shelf_id = ?', [shelfId])[0] as any).c;

describe('Shelf routes', () => {
  it('AC-1: create trims the name and returns the shelves-list fragment', async () => {
    const res = await create(1, '  favorites  ');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).toContain('>favorites<');
    expect(count(1)).toBe(4);
  });

  it('AC-2: empty or blank name returns 400 required error', async () => {
    for (const name of ['', '   ']) {
      const res = await create(1, name);
      expect(res.status).toBe(400);
      expect(res.text).toContain(ERR_REQUIRED);
      expect(res.headers['content-type']).not.toMatch(/json/);
    }
    expect(count(1)).toBe(3);
  });

  it('AC-3: duplicate name returns 400, other users may reuse the name', async () => {
    const dup = await create(1, 'read');
    expect(dup.status).toBe(400);
    expect(dup.text).toContain(ERR_DUP);
    expect(count(1)).toBe(3);

    expect((await create(1, 'favorites')).status).toBe(200);
    expect((await create(2, 'favorites')).status).toBe(200);
  });

  it('AC-4: create for unknown user returns 404', async () => {
    const res = await create(999, 'x');
    expect(res.status).toBe(404);
    expect(res.text).toContain(ERR_USER);
  });

  it('AC-5: rename updates the shelf and returns the fragment', async () => {
    const res = await rename(1, 'wishlist');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).toContain('wishlist');
    expect(res.text).not.toContain('want-to-read');
    expect(Shelf.getShelfById(1)?.name).toBe('wishlist');
  });

  it('AC-6: rename with blank or duplicate name returns 400 and keeps the name', async () => {
    const blank = await rename(1, '  ');
    expect(blank.status).toBe(400);
    expect(blank.text).toContain(ERR_REQUIRED);
    expect(Shelf.getShelfById(1)?.name).toBe('want-to-read');

    const dup = await rename(1, 'read');
    expect(dup.status).toBe(400);
    expect(dup.text).toContain(ERR_DUP);
    expect(Shelf.getShelfById(1)?.name).toBe('want-to-read');
  });

  it('AC-7: renaming a shelf to its own name succeeds', async () => {
    const a = await rename(1, 'want-to-read');
    expect(a.status).toBe(200);
    const b = await rename(1, '  want-to-read  ');
    expect(b.status).toBe(200);
    expect(Shelf.getShelfById(1)?.name).toBe('want-to-read');
  });

  it('AC-8: rename unknown shelf returns 404', async () => {
    const res = await rename(999, 'x');
    expect(res.status).toBe(404);
    expect(res.text).toContain(ERR_SHELF);
  });

  it('AC-9: delete removes the shelf and its links only', async () => {
    const before1 = shelfBookCount(1);
    const before2 = shelfBookCount(2);
    const before6 = shelfBookCount(6);
    expect(shelfBookCount(3)).toBeGreaterThan(0);

    const res = await del(3);
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).not.toContain('href="/shelves/3"');

    expect(shelfBookCount(3)).toBe(0);
    expect((all('SELECT COUNT(*) as c FROM books')[0] as any).c).toBe(50);
    expect(shelfBookCount(1)).toBe(before1);
    expect(shelfBookCount(2)).toBe(before2);
    expect(shelfBookCount(6)).toBe(before6);
    expect(Shelf.getShelfById(1)).toBeDefined();
    expect(Shelf.getShelfById(2)).toBeDefined();
  });

  it('AC-10: deleted default shelf is not recreated and can be created again', async () => {
    await del(3);
    const page = await request(app).get('/shelves/user/1');
    expect(page.status).toBe(200);
    expect(page.text).not.toContain('href="/shelves/3"');
    expect(page.text).toContain('href="/shelves/1"');
    expect(page.text).toContain('href="/shelves/2"');
    expect(count(1)).toBe(2);

    const res = await create(1, 'read');
    expect(res.status).toBe(200);
    expect(count(1)).toBe(3);
    expect(Shelf.getShelvesByUserId(1).map((s) => s.name)).toContain('read');
  });

  it('AC-11: user with no shelves sees empty state and can create', async () => {
    for (const id of [1, 2, 3]) await del(id);
    const page = await request(app).get('/shelves/user/1');
    expect(page.status).toBe(200);
    expect(page.text).toContain('No shelves yet');
    expect(page.text).toContain('id="new-shelf-form"');

    const res = await create(1, 'fresh');
    expect(res.status).toBe(200);
    expect(res.text).toContain('>fresh<');
  });

  it('AC-12: delete unknown shelf returns 404', async () => {
    const res = await del(999);
    expect(res.status).toBe(404);
    expect(res.text).toContain(ERR_SHELF);
  });

  it('AC-13: user page contains the management controls', async () => {
    const res = await request(app).get('/shelves/user/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="shelf-error"');
    expect(res.text).toContain('class="add-to-shelf"');
    expect(res.text).toContain('hx-patch="/shelves/1"');
    expect(res.text).toContain('hx-delete="/shelves/1"');
    expect(res.text).toContain('hx-confirm');
    expect(res.text).toContain('class="btn-remove"');
  });
});

describe('renameShelf', () => {
  it('AC-14: renames, returns undefined for unknown, throws on duplicate, allows other user reuse', () => {
    const renamed = Shelf.renameShelf(1, 'x');
    expect(renamed?.name).toBe('x');
    expect(Shelf.getShelfById(1)?.name).toBe('x');

    expect(Shelf.renameShelf(999, 'x')).toBeUndefined();
    expect(() => Shelf.renameShelf(1, 'read')).toThrow();
    expect(Shelf.renameShelf(4, 'x')?.name).toBe('x');
  });
});
