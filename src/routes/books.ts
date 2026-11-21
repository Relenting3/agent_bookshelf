import { Router, Request, Response } from 'express';
import * as Book from '../models/book.js';
import * as Review from '../models/review.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const books = Book.getAllBooks();
  res.render('books/index', { books });
});

router.get('/books/search', (req: Request, res: Response) => {
  const parsed = Book.parseSearchQuery(req.query.q);
  if (!parsed.ok) {
    return res.status(400).render('books/search-results', { books: [], query: '', error: parsed.error });
  }
  const { query } = parsed;
  res.render('books/search-results', { books: Book.searchBooks(query), query, error: null });
});

router.get('/books/:id', (req: Request, res: Response) => {
  const bookId = parseInt(req.params.id as string, 10);
  const book = Book.getBookById(bookId);

  if (!book) {
    return res.status(404).render('error', { message: 'Book not found' });
  }

  const reviews = Review.getReviewsByBookId(bookId);
  const averageRating = Review.getAverageRating(bookId);

  res.render('books/show', { book, reviews, averageRating });
});

router.post('/books/:id/reviews', (req: Request, res: Response) => {
  const bookId = parseInt(req.params.id as string, 10);
  const { userId, rating, reviewText } = req.body;

  if (!userId || !rating) {
    return res.status(400).send('<p class="error">User and rating are required</p>');
  }

  const existing = Review.getReviewByUserAndBook(parseInt(userId), bookId);
  if (existing) {
    return res.status(409).send('<p class="error">You have already reviewed this book</p>');
  }

  Review.createReview(parseInt(userId), bookId, parseInt(rating), reviewText);

  const reviews = Review.getReviewsByBookId(bookId);
  res.render('books/reviews-list', { reviews });
});

export default router;
