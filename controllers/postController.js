const User = require('../models/user');
const Post = require('../models/post');

// Return a list of all posts
exports.getPosts = async (req, res, next) => {
    await Post.find()
      .then(posts => {
        res.status(200).json(posts);
      })
      .catch(err => {
        res.status(502).json({
          error: err,
        });
      });
  }