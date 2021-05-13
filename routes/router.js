var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {});
});

router.get('/joinRoom', function(req, res, next) {
  console.log("Rendering " + req.query.game);
  if(req.query.game === "uno") res.render('unoRoom', {"params": req.query});
  else res.render('fuck', {});
});

module.exports = router;