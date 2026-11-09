import { Router, Request, Response } from 'express';
import * as Shelf from '../models/shelf.js';
import * as User from '../models/user.js';
import * as Book from '../models/book.js';

const router = Router();

const errorFragment = (res: Response, status: number, message: string) =>
  res.status(status).send(`<p class="error">${message}</p>`);

function renderShelvesList(res: Response, userId: number) {
  const user = User.getUserById(userId);
  const shelves = Shelf.getShelvesByUserId(userId).map(s => Shelf.getShelfWithBooks(s.id)!);
  res.render('shelves/shelves-list', { user, shelves });
}

function validateShelfName(body: any, userId: number, ownId?: number): { name: string } | { error: string } {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'Shelf name is required' };
  const duplicate = Shelf.getShelvesByUserId(userId).some(s => s.name === name && s.id !== ownId);
  if (duplicate) return { error: 'A shelf with that name already exists' };
  return { name };
}

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

  const shelves = Shelf.getShelvesByUserId(userId);
  const shelvesWithBooks = shelves.map(shelf => Shelf.getShelfWithBooks(shelf.id)!);

  res.render('shelves/user', { user, shelves: shelvesWithBooks });
});

router.post('/user/:userId', (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId as string, 10);
  if (!User.getUserById(userId)) return errorFragment(res, 404, 'User not found');

  const checked = validateShelfName(req.body, userId);
  if ('error' in checked) return errorFragment(res, 400, checked.error);

  try {
    Shelf.createShelf(userId, checked.name);
  } catch {
    return errorFragment(res, 400, 'A shelf with that name already exists');
  }
  renderShelvesList(res, userId);
});

router.patch('/:id', (req: Request, res: Response) => {
  const shelf = Shelf.getShelfById(parseInt(req.params.id as string, 10));
  if (!shelf) return errorFragment(res, 404, 'Shelf not found');

  const checked = validateShelfName(req.body, shelf.user_id, shelf.id);
  if ('error' in checked) return errorFragment(res, 400, checked.error);

  try {
    Shelf.renameShelf(shelf.id, checked.name);
  } catch {
    return errorFragment(res, 400, 'A shelf with that name already exists');
  }
  renderShelvesList(res, shelf.user_id);
});

router.delete('/:id', (req: Request, res: Response) => {
  const shelf = Shelf.getShelfById(parseInt(req.params.id as string, 10));
  if (!shelf) return errorFragment(res, 404, 'Shelf not found');

  Shelf.deleteShelf(shelf.id);
  renderShelvesList(res, shelf.user_id);
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
