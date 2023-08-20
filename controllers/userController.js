const User = require('../models/user');
const asyncHandler = require('express-async-handler');

// GET list of all users
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    }
    catch(err) {
        res.status(502).json({
            error: err,
        });
    }
}

// GET a single user
exports.getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userid)
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    }
    catch(err) {
        res.status(502).json({
            error: err,
        });
    }
};

// POST a friend request to another user by id
exports.sendFriendRequest = async (req, res, next) => {
  try {
    // Find the current user
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find user to send the friend request to
    const userToSend = await User.findById(req.params.userid);
    if (!userToSend) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current user has already sent a friend request to this user
    if (currentUser.friendRequestsSent.includes(userToSend._id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Check if the current user is already friends with this user
    if (currentUser.friends.includes(userToSend._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Add the user to send to the current user's friend requests sent array
    currentUser.friendRequestsSent.push(userToSend._id);
    await currentUser.save();

    // Add current user to the user's friend requests received array
    userToSend.friendRequestsReceived.push(currentUser._id);
    await userToSend.save();

    res.status(200).json({
      message: 'Friend request sent',
      currentUser,
      userToSend
    });
  } catch(err) {
    res.status(502).json({
      error: err,
    });
  }
}