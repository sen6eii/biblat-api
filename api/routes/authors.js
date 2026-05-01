const express = require('express');
const router = express.Router();
const { getAuthors } = require('../controllers/authors');

router.get('/', getAuthors);

module.exports = router;
