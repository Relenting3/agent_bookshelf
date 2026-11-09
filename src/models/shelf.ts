import { all, get, run } from '../db/index.js';

export interface Shelf {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
}

export interface ShelfWithBooks extends Shelf {
  username: string;
  books: ShelfBook[];
}

export interface ShelfBook {
  book_id: number;
  added_at: string;
  title: string;
  author: string;
}

export function getShelvesByUserId(userId: number): Shelf[] {
  return all(
    'SELECT * FROM shelves WHERE user_id = ? ORDER BY name',
    [userId]
  ) as unknown as Shelf[];
}

export function getShelfById(id: number): Shelf | undefined {
  return get('SELECT * FROM shelves WHERE id = ?', [id]) as unknown as Shelf | undefined;
}

export function getShelfWithBooks(shelfId: number): ShelfWithBooks | undefined {
  const shelf = get(`
    SELECT s.*, u.username
    FROM shelves s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `, [shelfId]) as unknown as (Shelf & { username: string }) | undefined;

  if (!shelf) return undefined;

  const books = all(`
    SELECT sb.book_id, sb.added_at, b.title, b.author
    FROM shelf_books sb
    JOIN books b ON sb.book_id = b.id
    WHERE sb.shelf_id = ?
    ORDER BY b.title
  `, [shelfId]) as unknown as ShelfBook[];

  return { ...shelf, books };
}

export function createShelf(userId: number, name: string): Shelf {
  const result = run('INSERT INTO shelves (user_id, name) VALUES (?, ?)', [userId, name]);
  return getShelfById(result.lastInsertRowid)!;
}

export function renameShelf(id: number, name: string): Shelf | undefined {
  const result = run('UPDATE shelves SET name = ? WHERE id = ?', [name, id]);
  return result.changes > 0 ? getShelfById(id) : undefined;
}

export function deleteShelf(id: number): boolean {
  // sql.js export() resets foreign_keys, so the cascade can't be relied on
  run('DELETE FROM shelf_books WHERE shelf_id = ?', [id]);
  const result = run('DELETE FROM shelves WHERE id = ?', [id]);
  return result.changes > 0;
}

export function addBookToShelf(shelfId: number, bookId: number): boolean {
  const existing = get(
    'SELECT 1 FROM shelf_books WHERE shelf_id = ? AND book_id = ?',
    [shelfId, bookId]
  );

  if (existing) return false;

  run(
    'INSERT INTO shelf_books (shelf_id, book_id) VALUES (?, ?)',
    [shelfId, bookId]
  );
  return true;
}

export function removeBookFromShelf(shelfId: number, bookId: number): boolean {
  const result = run(
    'DELETE FROM shelf_books WHERE shelf_id = ? AND book_id = ?',
    [shelfId, bookId]
  );
  return result.changes > 0;
}

export function getShelvesForBook(userId: number, bookId: number): Shelf[] {
  return all(`
    SELECT s.*
    FROM shelves s
    JOIN shelf_books sb ON s.id = sb.shelf_id
    WHERE s.user_id = ? AND sb.book_id = ?
    ORDER BY s.name
  `, [userId, bookId]) as unknown as Shelf[];
}
