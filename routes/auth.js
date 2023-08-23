const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

router.post('/signup', authController.userSignup);

router.post('/login', authController.userLogin);

router.post('/logout', authController.userLogout);

// POST login route for oauth login authentication
router.post('/oauth-login', authController.oauthLogin);

// POST visitor login route
router.post('/visitor-login', authController.visitorLogin);

module.exports = router;