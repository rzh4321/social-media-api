const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Like = require('../models/like');
const mongoose = require('mongoose');
const Image = require('../models/image');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const uploadImage = require('./utils/uploadImage');

// post a post
exports.postApost = [
    uploadImage,
    // check if logged in
    passport.authenticate('jwt', { session: false }), 

    async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        // Find and check user by req.user.id
        const user = await User.findById(req.user.id);
        if (!user) {
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
        // Create Image object with the accepted uploaded image, or empty if image is rejected
        let image;
        if (req.file) {
          image = new Image({
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            data: req.file.buffer,
          });
        }
    
        // Create new Post object
        const post = new Post({
          content: req.body.content,
          user: new mongoose.Types.ObjectId(req.user.id),
          image,
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
            // if theres an image, save it
            if (image) 
              await image.save();
            // Save post to database
            await post.save();
            // Push the post to the user
            const user = await User.findById(req.user.id);
            user.posts.push(post);
            await user.save();
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
exports.getPosts = [
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
    // Check that the user is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
    try {
        const posts = await Post.find({ user: req.user._id })
                      .populate('user')
                      .populate({
                        path: 'comments',
                        populate: {
                          path: 'user',
                        }
                      });
        res.status(200).json({ posts: user.posts });
    }
    catch(err) {
        res.status(502).json({
            error: err,
          });
    }
  }];

// POST a friend request to another user by id
exports.sendFriendRequest = [
  passport.authenticate('jwt', { session: false }),

  async (req, res, next) => {
  if (!req.user) {
      return res.status(401).json({ message: "Not logged in" });
  }
  try {
      // Find the current user
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
}];

// Accept a friend request from another user given their userid (POST)
exports.acceptFriendRequest = [
  passport.authenticate('jwt', { session: false }),

  async (req, res, next) => {
    // Check that the user is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      // Find the user
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
}];

exports.giveLike = [
  passport.authenticate('jwt', { session: false }),
  
  async (req, res, next) => {
  // Check that the user is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Find user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the post by req.params.postid
    const post = await Post.findById(req.params.postid);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the user has already liked this post
    if (post.likes.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already liked' });
    }

    const newLike = new Like({
      user: new mongoose.Types.ObjectId(req.user.id),
      post: new mongoose.Types.ObjectId(req.params.postid),
    })
    await newLike.save();
    // Add the user to the post's likes array
    post.likes.push(newLike);
    await post.save();
    post.populate('likes')
    console.log(post);
    return res.status(200).json({ 
      message: 'Like added',
      post
    });

  } catch (err) {
    res.status(502).json({
      error: err,
    });
  }
}];

exports.postAComment = [
  passport.authenticate('jwt', { session: false }),

  // Check that the user is logged in
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find the user by req.user.id
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Find the post by req.params.postid
    const post = await Post.findById(req.params.postid);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    next();
  },

  // Validate and sanitize the comment data
  body('content', 'Content is required')
    .trim().isLength({ min: 1 }).escape(),

  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a Comment object with escaped and trimmed data
    const comment = new Comment({
      content: req.body.content,
      user: new mongoose.Types.ObjectId(req.user.id),
      post: new mongoose.Types.ObjectId(req.params.postid),
    });

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        comment
      });
    } else {
      // Data is valid
      try {
        // Save comment to database
        await comment.save();
        // Reference the comment in the post
        const post = await Post.findById(req.params.postid);
        post.comments.push(comment);
        await post.save();
        res.status(201).json({
          post,
          comment
        });
      } catch (err) {
        res.status(502).json({
          error: err,
        });
      }
    }
  }
];

exports.getFriendsPosts = [
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
    // Check that the user is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find and check user by req.user.id
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    try {
      // populate friends' posts, the posts' users, the posts' comments' users,
      // the posts' images
      const result = await User.findById(req.user._id)
      .populate({
        path: 'friends',
        populate: {
          path: 'posts',
          populate: {
            path: 'user',
          }
        }
      })
      .populate({
        path: 'friends',
        populate: {
          path: 'posts',
          populate: {
            path: 'comments',
            populate: {
              path: 'user',
            }
          }
        }
      });
      // all friend posts will be in this array
      const posts = [];
      result.friends.map((friend) => {
        friend.posts.map((post) => {
            posts.push(post);
          });
      });

      posts.sort((a, b) => {
        // most recent comes first
        if (a.timestamp > b.timestamp) {
          return -1;
        }
        if (a.timestamp < b.timestamp) {
          return 1;
        }
      })
      res.status(200).json({ posts: posts });
    }
    catch(err) {
      console.log(err);
      res.status(502).json({
        error: err,
      });
    }

  }
];

exports.editProfile = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }),

  // Check that the user is logged in
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find the user by req.user.id
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    next();
  },

  // Validate and sanitize the comment data
  body('name', 'Name is required')
    .trim().isLength({ min: 1 }).escape(),
  // body('profilePicUrl', 'Profile picture is required')
  //   .trim().isURL(),

  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    } else {
      // Data is valid
      try {
        // Update the user's profile
        const user = await User.findByIdAndUpdate(
          req.user.id,
          {
            name: req.body.name,
            profileUrl: req.body.profilePicUrl
          }
        );
        res.status(200).json({
          user,
        });
      } catch (err) {
        res.status(502).json({
          error: err,
        });
      }
    }
  }

];

exports.cancelLike = [
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
    // Check that the user is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      // Find the user by req.user.id
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Find the post by req.params.postid
      const post = await Post.findById(req.params.postid);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Check if the user has already liked this post
      if (!post.likes.includes(user.id)) {
        return res.status(400).json({ message: 'Like not found' });
      }

      // Remove the user from the post's likes array
      post.likes.pull(currentUser._id);
      await post.save();
      return res.status(201).json({ 
        message: 'Like cancelled',
        post
      });

    } catch (err) {
      console.log(err);
      res.status(502).json({
        error: err,
      });
    }
  },
];