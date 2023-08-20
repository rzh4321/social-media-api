var express = require('express');
var router = express.Router();
const user_controller = require('../controllers/userController');

// GET list of users
router.get('/', user_controller.getUsers);

// GET a single user with userid
router.get('/:userid', user_controller.getUser);

// POST friend request from current user to another user by userid
router.post('/:userid/send-friend-request', user_controller.sendFriendRequest);

module.exports = router;