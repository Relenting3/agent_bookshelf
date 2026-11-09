import { Router, Request, Response } from 'express';
import * as Shelf from '../models/shelf.js';
import * as User from '../models/user.js';
import * as Book from '../models/book.js';

const router = Router();

function loadShelvesWithBooks(userId: number) {
  return Shelf.getShelvesByUserId(userId).map(shelf => Shelf.getShelfWithBooks(shelf.id)!);
}

function isUniqueError(err: unknown): boolean {
  return err instanceof Error && /UNIQUE/i.test(err.message);
}

const NAME_REQUIRED = '<p class="error">Shelf name is required</p>';
const NAME_DUPLICATE = '<p class="error">A shelf with that name already exists</p>';
const SHELF_NOT_FOUND = '<p class="error">Shelf not found</p>';

router.get('/', (req: Request, res: Response) => {
  const users = User.getAllUsers();
  res.render('shelves/index', { users });
});

router.get('/user/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string, 10);
  const user = User.getUserById(userId);

  if (!user) {
    return res.status(404).render('error', { message: 'User not found' });
  }

  res.render('shelves/user', { user, shelves: loadShelvesWithBooks(userId) });
});

router.post('/user/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string, 10);

  if (!User.getUserById(userId)) {
    return res.status(404).send('<p class="error">User not found</p>');
  }

  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    return res.status(400).send(NAME_REQUIRED);
  }
  if (Shelf.getShelvesByUserId(userId).some(s => s.name === name)) {
    return res.status(400).send(NAME_DUPLICATE);
  }

  try {
    Shelf.createShelf(userId, name);
  } catch (err) {
    if (isUniqueError(err)) return res.status(400).send(NAME_DUPLICATE);
    throw err;
  }

  res.render('shelves/shelves-list', { shelves: loadShelvesWithBooks(userId) });
});

router.patch('/:id', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const shelf = Shelf.getShelfById(shelfId);

  if (!shelf) {
    return res.status(404).send(SHELF_NOT_FOUND);
  }

  const name = String(req.body?.name ?? '').trim();
  if (!name) {
    return res.status(400).send(NAME_REQUIRED);
  }
  if (Shelf.getShelvesByUserId(shelf.user_id).some(s => s.id !== shelfId && s.name === name)) {
    return res.status(400).send(NAME_DUPLICATE);
  }

  try {
    Shelf.renameShelf(shelfId, name);
  } catch (err) {
    if (isUniqueError(err)) return res.status(400).send(NAME_DUPLICATE);
    throw err;
  }

  res.render('shelves/shelves-list', { shelves: loadShelvesWithBooks(shelf.user_id) });
});

router.delete('/:id', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const shelf = Shelf.getShelfById(shelfId);

  if (!shelf) {
    return res.status(404).send(SHELF_NOT_FOUND);
  }

  Shelf.deleteShelf(shelfId);
  res.render('shelves/shelves-list', { shelves: loadShelvesWithBooks(shelf.user_id) });
});

router.get('/:id', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const shelf = Shelf.getShelfWithBooks(shelfId);

  if (!shelf) {
    return res.status(404).render('error', { message: 'Shelf not found' });
  }

  const allBooks = Book.getAllBooks();
  res.render('shelves/show', { shelf, allBooks });
});

router.post('/:id/books', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).send('<p class="error">Book ID is required</p>');
  }

  Shelf.addBookToShelf(shelfId, parseInt(bookId));

  const shelf = Shelf.getShelfWithBooks(shelfId)!;
  res.render('shelves/books-list', { shelf });
});

router.delete('/:id/books/:bookId', (req: Request, res: Response) => {
  const shelfId = parseInt(req.params.id as string, 10);
  const bookId = parseInt(req.params.bookId as string, 10);

  Shelf.removeBookFromShelf(shelfId, bookId);

  const shelf = Shelf.getShelfWithBooks(shelfId)!;
  res.render('shelves/books-list', { shelf });
});

export default router;
