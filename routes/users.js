var express = require('express');
var router = express.Router();
const userController = require('../controllers/userController');

// GET list of users
router.get('/', userController.getUsers);

// GET a single user with userid
router.get('/:userid', userController.getUser);

// GET list of friends
router.get('/:userid/friends', userController.getFriends);

// GET a list of posts made by the user with userid
router.get('/:userid/posts', userController.getPosts);



module.exports = router;