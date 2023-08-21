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

  exports.getAPost = async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.postid)
        .populate('user');
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
    }
    catch(err) {
      res.status(502).json({
        error: err,
      });
    }
  };