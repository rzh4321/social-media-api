const express = require('express');
const router = express.Router();

const imageController = require('../controllers/imageController');

// GET a image by imageid
router.get('/:imageid', imageController.getImage);

module.exports = router;