const express = require('express');
const router = express.Router();

const postController = require('../controllers/postController');

// GET a list of posts of the currentUser
router.get('/', postController.getPosts);

// GET a single post given postid
router.get('/:postid', postController.getAPost);

// GET a list of comments of the post with postid
router.get('/:postid/comments', postController.getComments);

// GET a list of likes by users of the post with postid
router.get('/:postid/likes', postController.getLikes);

module.exports = router;