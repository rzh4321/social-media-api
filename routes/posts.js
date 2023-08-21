const express = require('express');
const router = express.Router();

const postController = require('../controllers/postController');

// GET a list of posts of the currentUser
router.get('/', postController.getPosts);

// GET a single post given postid
router.get('/:postid', postController.getAPost);


module.exports = router;