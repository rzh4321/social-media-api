const User = require('../models/user');
const asyncHandler = require('express-async-handler');

// GET list of all users
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        console.log(users);
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
    if (!req.user) {
        return res.status(401).json({ message: "Not logged in" });
    }
    try {
        // Find the current user
        console.log(req.params.userid);
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find user to send the friend request to
        const userToSend = await User.findById(req.params.userid);
        if (!userToSend) {
        return res.status(404).json({ message: 'User not found' });
        }

        // Check if current user has already sent a friend request to this user
        if (currentUser.friendRequestsSent.includes(userToSend.id)) {
        return res.status(400).json({ message: 'Friend request already sent' });
        }

        // Check if the current user is already friends with this user
        if (currentUser.friends.includes(userToSend.id)) {
        return res.status(400).json({ message: 'Already friends' });
        }

        // Add the user to send to the current user's friend requests sent array
        currentUser.friendRequestsSent.push(userToSend.id);
        await currentUser.save();

        // Add current user to the user's friend requests received array
        userToSend.friendRequestsReceived.push(currentUser.id);
        await userToSend.save();

        res.status(200).json({
            message: 'Friend request sent',
            currentUser,
            userToSend
        });
    } 
    catch(err) {
        res.status(502).json({
            error: err,
        });
    }
}

// GET list of friends given userid
exports.getFriends = async (req, res, next) => {
    try {
        const user = User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user.friends);
    }
    catch(err) {
        res.status(502).json({
            error: err,
        })
    }
}

// Accept a friend request from another user given their userid (POST)
exports.acceptFriendRequest = async (req, res, next) => {
    // Check that the currentUser is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      // Find the currentUser
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Find the otherUser by req.params.userid
      const otherUser = await User.findById(req.params.userid);
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Check if the user is already friends with this user
      if (user.friends.includes(otherUser.id)) {
        return res.status(400).json({ message: 'Already friends' });
      }
  
      // Add the otherUser to the user's friends array
      user.friends.push(otherUser.id);
      // Delete the otherUser from the user's friend requests received array
      user.friendRequestsReceived.splice(user.friendRequestsReceived.indexOf(otherUser.id), 1);
      await user.save();
  
      // Add the user to the otherUser's friends array
      otherUser.friends.push(user.id);
      // Delete the user from the otherUser's friend requests sent array
      otherUser.friendRequestsSent.splice(otherUser.friendRequestsSent.indexOf(user.id), 1);
      await otherUser.save();
  
      // Send a response with the updated user objects
      res.status(200).json({
        message: 'Friend request accepted',
        user,
        otherUser
      }); 
    } catch(err) {
      res.status(502).json({
        error: err,
      });
    }
}