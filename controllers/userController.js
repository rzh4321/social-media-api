const User = require('../models/user');
const asyncHandler = require('express-async-handler');

// GET list of all users
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find();
        res.status(200).json({users});
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
        const user = await User.findById(req.params.userid).populate('friends friendRequestsSent friendRequestsReceived');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({user});
    }
    catch(err) {
        res.status(502).json({
            error: err,
        });
    }
};


// GET list of friends given userid
exports.getFriends = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userid).populate("friends");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({friends: user.friends});
    }
    catch(err) {
        res.status(502).json({
            error: err,
        })
    }
}

// GET a list of posts made by the user with userid
exports.getPosts = async(req, res, next) => {
    try {
        const user = await User.findById(req.params.userid).populate({
            path: 'posts',
            populate: {
                path: 'user',
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ posts: user.posts });
    }
    catch(err) {
        res.status(502).json({
            error: err,
          });
    }
}