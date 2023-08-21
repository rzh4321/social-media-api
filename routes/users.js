var express = require('express');
var router = express.Router();
const user_controller = require('../controllers/userController');

// GET list of users
router.get('/', user_controller.getUsers);

// GET a single user with userid
router.get('/:userid', user_controller.getUser);

// GET list of friends
router.get('/:userid/friends', user_controller.getFriends);

// POST friend request from current user to another user by userid
router.post('/send-friend-request/:userid', user_controller.sendFriendRequest);

router.post('/accept-friend-request/:userid', user_controller.acceptFriendRequest);


module.exports = router;