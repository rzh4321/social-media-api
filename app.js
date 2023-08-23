var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const RateLimit = require('express-rate-limit');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const authuserRouter = require('./routes/authuser');
const postsRouter = require('./routes/posts');
const imagesRouter = require('./routes/images');

require('dotenv').config();

// set up mongoose
mongoose.set('strictQuery', false);
async function main() {
  await mongoose.connect(process.env.MONGODB);
}

main().catch(console.error)

var app = express();

app.use(helmet());

// Express-rate-limit setup
const limiter = RateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, 
});
app.use(limiter);

app.use(compression());

// Only allow requests from frontend
// app.use(cors({
//   origin: 'http://localhost:3000',
// }));

// set up passport session
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/authuser', authuserRouter);
app.use('/api/posts', postsRouter);
app.use('/api/images', imagesRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
