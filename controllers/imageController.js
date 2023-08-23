const Image = require('../models/image');

exports.getImage = async (req, res, next) => {
    try {
        const image = await Image.findById(req.params.imageid);
      if (!image) {
        return res.status(404).json({ message: 'Image not found' });
      }
      res.status(200).json({ 
        image: image
      });
    }
    catch(err) {
        res.status(502).json({
            error: err,
          });
    }
}