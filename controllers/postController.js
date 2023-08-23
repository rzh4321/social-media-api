const User = require('../models/user');
const Post = require('../models/post');
const Like = require('../models/like');

const { response } = require('../app');

// Return a list of all posts sorted by timestamp
  exports.getPosts = async (req, res, next) => {
    try {
      const posts = await Post.find()
        .sort({ timestamp: -1 })
        .populate('user')
        .populate('image')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
          }
        });
      res.status(200).json({posts});
    }
    catch(err) {
      res.status(502).json({
        error: err
      })
    }
  }

  exports.getAPost = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.postid)
        .populate('user');
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.status(200).json({ post });
    }
    catch(err) {
      res.status(502).json({
        error: err,
      });
    }
  };



// GET all comments under this post given postid
exports.getComments = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postid).populate({
      path: 'comments',
      populate: {
        path: 'user',
      }});
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json({ 
      comments: post.comments 
    });
  }
  catch(err) {
    res.status(502).json({
      error: err,
    });
  }
}

// GET all likes under this post given postid
exports.getLikes = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postid).populate({
      path: 'likes',
      populate: {
        path: 'post'
      }});
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.status(200).json({ 
      likes: post.likes 
    });
  }
  catch (err) {
    res.status(502).json({
      error: err,
    });
  }
}

