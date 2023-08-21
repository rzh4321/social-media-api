const User = require("../models/user");
const bcrypt = require("bcryptjs");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const asyncHandler = require("express-async-handler");

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
        // const match = password === user.password;
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

exports.userSignup = asyncHandler(async (req, res, next) => {
  const user = User.findOne({ username: req.body.username });
  if (user) {
    return res.status(400).json({ message: "Username is taken" });
  }
  bcrypt.hash(req.body.password, 10, async (err, hashed) => {
    if (err) {
      return next(err);
    }
    try {
      const newUser = new User({
        name: req.body.name,
        username: req.body.username,
        password: hashed,
      });
      const result = await newUser.save();
      res.status(201).json(result);
    } catch {
      return next(err);
    }
  });
});

exports.userLogin = [
  passport.authenticate("local", {
    failureMessage: true,
  }),

  (req, res) => {
    if (req.user) res.status(200).json({ message: "Logged in" });
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
