const User = require("../models/user");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const asyncHandler = require("express-async-handler");
const JwtStrategy = require('passport-jwt').Strategy,
      ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const { validationResult, body } = require('express-validator');
require('dotenv').config();


passport.use(
  new LocalStrategy(
    asyncHandler(async (username, password, done) => {
      try {
        const regex = new RegExp(username, "i");
        const user = await User.findOne({ username: { $regex: regex } });
        if (!user) {
          console.log("USERNAME DOESNT EXIST");
          return done(null, false, { message: "Username does not exist" });
        }
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
          // passwords do not match
          console.log("PASSWOWRDS DONT MATCH");
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        console.log("OUTER TYR BLOCK ERRORED");
        return done(err);
      }
    }),
  ),
);

// Passport JWT strategy setup
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use(new JwtStrategy(opts, async function(jwt_payload, done) {
  try {
    const user = await User.findById(jwt_payload.id);
    if (user) {
      return done(null, user);
    }
    else {
      return done(null, false);
    }
  }
  catch(err) {
    done(err, false);
  }
}));


passport.serializeUser((user, done) => {
  process.nextTick(() => {
    done(null, {
      id: user.id,
      username: user.username,
    });
  });
});

passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    done(null, user);
  });
});

// function to generate random usernames
function generateRandomUsername() {
  const adjectives = ['happy', 'lucky', 'sunny', 'clever', 'bright', 'vivid'];
  const nouns = ['cat', 'dog', 'rabbit', 'bird', 'tiger', 'lion'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * (1000 - 0 + 1) + 0);

  
  return `${randomAdjective}_${randomNoun}_${randomNumber}`;
}



exports.userSignup = [
  // Validate and sanitize the sign up data
  body('name', 'Name is required')
    .trim().isLength({ min: 1 }).escape(),
  body('username', 'Username is required')
    .trim().isLength({ min: 1 }).escape(),
  body('password', 'Password is required at least 6 characters')
    .trim().isLength({ min: 6 }).escape(),

    async (req, res, next) => {
      // Process the validation errors
      const errors = validationResult(req);
  
      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
          input: req.body
        });
      }
      next();
    }, 

    asyncHandler(async (req, res, next) => {
      const user = await User.findOne({ username: req.body.username });
      if (user) {
        return res.status(400).json({
          errors: [{ 
            location: 'body',
            param: 'username',
            value: req.body.username,
            msg: 'Username already taken' }],
          input: req.body
        });
      }
      bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
          return next(err);
        }
        try {
          const user = new User({
            name: req.body.name,
            username: req.body.username,
            password: hashedPassword,
          });
          await user.save();
          res.status(201).json({user}); 
        } 
        catch(err) {
          return next(err);
        }
      });
    })
]

exports.userLogin = [
  passport.authenticate("local", {
    failureMessage: true,
  }),

  (req, res) => {
    if (req.user) {
      const token = jwt.sign({ id: req.user_id }, process.env.JWT_SECRET);
      res.status(200).json({ message: "Logged in", user: req.user, token });
    }
    else res.status(400).json({ message: "Login failed" });
  },
];

exports.userLogout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.status(200).json({ message: "Logged out" });
  });
};

exports.oauthLogin = [
  asyncHandler(async (req, res, next) => {
    // see if user already has an account
    const user = await User.findOne({ username: req.body.username });
    if (user) {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
      return res.status(200).json({
        message: 'logged in',
        user: user,
        token
      })
    }
    // try to create one in next middleware
    next();
  }),

asyncHandler(async (req, res, next) => {
  const user = new User({
    name: req.body.name,
    username: req.body.username,
    profileUrl: req.body.profilePicUrl,
  });
  await user.save();
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
          return res.status(200).json({
            message: 'logged in',
            user: user,
            token
          });
})

];

exports.visitorLogin = [
  async (req, res, next) => {
    // generate random username and save user
    const username = generateRandomUsername();
    bcrypt.hash(username, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }
      try {
        const user = new User({
          name: username,
          username: username,
          password: hashedPassword,
        });
        await user.save();
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
        return res.status(200).json({
          message: 'logged in',
          user: user,
          token
        });
      } catch(err) {
        return next(err);
      }
    });
  }
];