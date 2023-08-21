var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// GET protected page
router.get('/protected', 
  function(req, res, next) {
    if (req.user) {
      res.send('protected page shown');
    } else {
      res.status(401).send('Unauthorized');
    }
})

module.exports = router;
