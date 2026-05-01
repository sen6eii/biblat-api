const express = require('express');
const router = express.Router();
const { getBooks, getBookById, getBookByIsbn, searchBooks, createBook, updateBook, deleteBook } = require('../controllers/books');
const { requireApiKey } = require('../middleware/auth');

router.get('/search', searchBooks);
router.get('/isbn/:isbn', getBookByIsbn);
router.get('/:id', getBookById);
router.get('/', getBooks);

router.post('/', requireApiKey, createBook);
router.put('/:id', requireApiKey, updateBook);
router.delete('/:id', requireApiKey, deleteBook);

module.exports = router;
