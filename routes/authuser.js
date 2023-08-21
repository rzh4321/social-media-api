const express = require('express');
const router = express.Router();

const authuserController = require('../controllers/authuserController');

// POST a new post by the authenticated user
router.post('/posts', authuserController.postApost);

// GET a list of posts by the authenticated user
router.get('/posts', authuserController.getPosts);

module.exports = router;