const express = require('express');
const router = express.Router();

const authuserController = require('../controllers/authuserController');

// POST a new post by the authenticated user
router.post('/posts', authuserController.postApost);

// GET a list of posts by the authenticated user
router.get('/posts', authuserController.getPosts);

// POST a friend request from the currentUser to another user by userid
router.post('/send-friend-request/:userid', authuserController.sendFriendRequest);

// POST to accpet a friend request from another user by userid to the currentUser
router.post('/accept-friend-request/:userid', authuserController.acceptFriendRequest);

module.exports = router;