const User = require('../models/user');
const Post = require('../models/post');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// post a post
exports.postApost = [
    // check if logged in
    async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Find and check currentUser by req.user.id
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
          return res.status(404).json({ message: 'User not found' });
        } 
        else {
          next();
        }
    },

    // Validate and sanitize data
    body('content', 'Content is required')
    .trim().isLength({ min: 1 }).escape(),

    async (req, res, next) => {
        const errors = validationResult(req);
    
        // Create new Post object
        const post = new Post({
          content: req.body.content,
          user: new mongoose.Types.ObjectId(req.user.id),
        });
    
        if (!errors.isEmpty()) {
          return res.status(400).json({ 
            errors: errors.array(),
            post,
          });
        } 
        else {
          // post is valid
          try {
            // Save post to database
            await post.save();
            // Push the post to the currentUser
            const currentUser = await User.findById(req.user.id);
            currentUser.posts.push(post);
            await currentUser.save();
            res.status(201).json({ post });
          } 
          catch (err) {
            res.status(502).json({
              error: err,
            });
          }
        }
    }
];

// get all posts by user
exports.getPosts = async (req, res, next) => {
    // Check that the user is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await User.findById(req.user.id).populate('posts');
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