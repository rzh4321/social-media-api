const express = require('express');
const router = Express.Router();

const authController = require('../controllers/authController');

router.post('/signup', authController.userSignup);

router.post('/login', authController.userLogin);

router.post('/login', authController.userLogout);
