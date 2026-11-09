import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { unlinkSync } from 'fs';
import app from '../../src/server.js';
import { initDb, closeDb, all, get } from '../../src/db/index.js';
import { renameShelf } from '../../src/models/shelf.js';

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

function shelfId(userId: number, name: string): number {
  const row = get('SELECT id FROM shelves WHERE user_id = ? AND name = ?', [userId, name]) as any;
  return row.id as number;
}

function shelfNames(userId: number): string[] {
  return (all('SELECT name FROM shelves WHERE user_id = ? ORDER BY id', [userId]) as any[]).map(
    (r) => r.name
  );
}

describe('Shelf HTMX routes', () => {
  it('AC-1: POST creates a shelf with trimmed name', async () => {
    const res = await request(app).post('/shelves/user/1').type('form').send({ name: '  favourites  ' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).toContain('favourites');
    const names = shelfNames(1);
    expect(names).toHaveLength(4);
    expect(names).toContain('favourites');
  });

  it('AC-2: POST with empty or whitespace name returns 400 error fragment', async () => {
    for (const name of ['', '   ']) {
      const res = await request(app).post('/shelves/user/1').type('form').send({ name });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<p class="error">');
      expect(() => JSON.parse(res.text)).toThrow();
    }
    expect(shelfNames(1)).toHaveLength(3);
  });

  it('AC-3: POST with duplicate name returns 400 and server keeps working', async () => {
    const res = await request(app).post('/shelves/user/1').type('form').send({ name: 'read' });
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<p class="error">');
    expect(shelfNames(1)).toHaveLength(3);
    const next = await request(app).post('/shelves/user/1').type('form').send({ name: 'another' });
    expect(next.status).toBe(200);
  });

  it('AC-4: POST for unknown user returns 404 error fragment', async () => {
    const res = await request(app).post('/shelves/user/9999').type('form').send({ name: 'x' });
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<p class="error">');
  });

  it('AC-5: PATCH renames a shelf', async () => {
    const id = shelfId(1, 'want-to-read');
    const res = await request(app).patch(`/shelves/${id}`).type('form').send({ name: 'wishlist' });
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).toContain('wishlist');
    expect(res.text).not.toContain('want-to-read');
    expect((get('SELECT name FROM shelves WHERE id = ?', [id]) as any).name).toBe('wishlist');
  });

  it('AC-6: PATCH with empty, whitespace or duplicate name returns 400 and leaves name unchanged', async () => {
    const id = shelfId(1, 'want-to-read');
    for (const name of ['', '   ', 'read']) {
      const res = await request(app).patch(`/shelves/${id}`).type('form').send({ name });
      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toContain('<p class="error">');
      expect((get('SELECT name FROM shelves WHERE id = ?', [id]) as any).name).toBe('want-to-read');
    }
  });

  it('AC-7: PATCH to own current name returns 200', async () => {
    const id = shelfId(1, 'read');
    const res = await request(app).patch(`/shelves/${id}`).type('form').send({ name: 'read' });
    expect(res.status).toBe(200);
  });

  it('AC-8: PATCH unknown shelf returns 404 error fragment', async () => {
    const res = await request(app).patch('/shelves/9999').type('form').send({ name: 'x' });
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<p class="error">');
  });

  it('AC-9: DELETE removes shelf and its shelf_books, keeps books and other shelves', async () => {
    const id = shelfId(1, 'read');
    const before = (get('SELECT COUNT(*) AS c FROM shelf_books WHERE shelf_id = ?', [id]) as any).c;
    expect(before).toBeGreaterThan(0);
    const res = await request(app).delete(`/shelves/${id}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).not.toContain('>read<');
    expect(res.text).not.toContain(`/shelves/${id}"`);
    expect((get('SELECT COUNT(*) AS c FROM shelf_books WHERE shelf_id = ?', [id]) as any).c).toBe(0);
    expect((get('SELECT COUNT(*) AS c FROM books') as any).c).toBe(50);
    expect(shelfNames(1)).toEqual(['want-to-read', 'currently-reading']);
  });

  it('AC-10: after deleting a shelf, its name can be created again', async () => {
    await request(app).delete(`/shelves/${shelfId(1, 'read')}`);
    expect(shelfNames(1)).not.toContain('read');
    const res = await request(app).post('/shelves/user/1').type('form').send({ name: 'read' });
    expect(res.status).toBe(200);
    expect(shelfNames(1)).toContain('read');
  });

  it('AC-11: user with no shelves sees empty state and can create again', async () => {
    for (const name of ['want-to-read', 'currently-reading', 'read']) {
      const res = await request(app).delete(`/shelves/${shelfId(1, name)}`);
      expect(res.status).toBe(200);
    }
    expect(shelfNames(1)).toHaveLength(0);
    const page = await request(app).get('/shelves/user/1');
    expect(page.status).toBe(200);
    expect(page.text).toContain('No shelves yet');
    expect(page.text).toContain('id="new-shelf-form"');
    const res = await request(app).post('/shelves/user/1').type('form').send({ name: 'fresh' });
    expect(res.status).toBe(200);
    expect(shelfNames(1)).toEqual(['fresh']);
  });

  it('AC-12: DELETE unknown shelf returns 404 error fragment', async () => {
    const res = await request(app).delete('/shelves/9999');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('<p class="error">');
  });

  it('AC-13: user shelves page has form, list root and per-card controls', async () => {
    const res = await request(app).get('/shelves/user/1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('id="new-shelf-form"');
    expect(res.text).toContain('id="shelves-list"');
    expect(res.text).toContain('hx-patch');
    expect(res.text).toContain('hx-delete');
    expect(res.text).toContain('hx-confirm');
    for (const name of ['want-to-read', 'currently-reading', 'read']) {
      expect(res.text).toContain(name);
    }
  });
});

describe('renameShelf model', () => {
  it('AC-14: renames an existing shelf and returns undefined for a missing one', () => {
    const id = shelfId(1, 'read');
    const updated = renameShelf(id, 'x');
    expect(updated?.name).toBe('x');
    expect(renameShelf(9999, 'x')).toBeUndefined();
  });
});
