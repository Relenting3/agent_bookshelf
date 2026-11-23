import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
import { initDb, closeDb } from '../../src/db/index.js';
import { searchBooks, getAllBooks } from '../../src/models/book.js';

const DB = '/tmp/test-book-search.db';

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

const titles = (rows: { title: string }[]) => rows.map((b) => b.title);

describe('searchBooks', () => {
  it('AC-1: searchBooks matches title partial in any case', () => {
    expect(titles(searchBooks('PRAGMATIC'))).toEqual(['The Pragmatic Programmer']);
    expect(titles(searchBooks('pRaGmAtIc'))).toEqual(['The Pragmatic Programmer']);
  });

  it('AC-2: HERBERT returns Dune', () => {
    expect(titles(searchBooks('HERBERT'))).toContain('Dune');
    expect(searchBooks('HERBERT').every((b) => b.author.toLowerCase().includes('herbert'))).toBe(true);
  });

  it('AC-2: weir returns exactly Project Hail Mary and The Martian', () => {
    expect(titles(searchBooks('weir')).sort()).toEqual(['Project Hail Mary', 'The Martian']);
  });

  it('AC-3: MIÉVILLE and miéville return The City & the City', () => {
    expect(titles(searchBooks('MIÉVILLE'))).toEqual(['The City & the City']);
    expect(titles(searchBooks('miéville'))).toEqual(['The City & the City']);
  });

  it('AC-3: mieville returns []', () => {
    expect(searchBooks('mieville')).toEqual([]);
  });

  it('AC-4: pragmatic programmer matches as a phrase', () => {
    expect(titles(searchBooks('pragmatic programmer'))).toEqual(['The Pragmatic Programmer']);
  });

  it("AC-4: words split across title and author don't match", () => {
    expect(searchBooks('dune herbert')).toEqual([]);
  });

  it('AC-5: results follow getAllBooks() order', () => {
    const expected = titles(getAllBooks()).filter((t) => t.toLowerCase().includes('the'));
    const actual = titles(searchBooks('the')).filter((t) => t.toLowerCase().includes('the'));
    expect(actual).toEqual(expected);
    expect(searchBooks('the').length).toBeGreaterThan(1);
  });

  it('AC-7: empty and whitespace queries return all 50, first 1984', () => {
    for (const q of ['', '   ']) {
      const res = searchBooks(q);
      expect(res).toHaveLength(50);
      expect(res[0].title).toBe('1984');
      expect(titles(res)).toEqual(titles(getAllBooks()));
    }
  });

  it("AC-8: '  dune  ' equals 'dune'", () => {
    const trimmed = searchBooks('dune');
    expect(trimmed.length).toBeGreaterThan(0);
    expect(searchBooks('  dune  ')).toEqual(trimmed);
  });

  it('AC-11: % _ and \\ each return []', () => {
    expect(searchBooks('%')).toEqual([]);
    expect(searchBooks('_')).toEqual([]);
    expect(searchBooks('\\')).toEqual([]);
  });
});
