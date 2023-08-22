const User = require('../models/user');
const Post = require('../models/post');
const { response } = require('../app');

// Return a list of all posts sorted by timestamp
// exports.getPosts = async (req, res, next) => {
//     await Post.find()
//       .sort({ timestamp: -1 })
//       .then(posts => {
//         res.status(200).json(posts);
//       })
//       .catch(err => {
//         res.status(502).json({
//           error: err,
//         });
//       });
//   }

  exports.getPosts = async (req, res, next) => {
    try {
      const posts = await Post.find().sort({ timestamp: -1 });
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