require('dotenv').load();

var express        = require('express');
var geojson        = require('exif-to-geojson');
var Tumblr         = require('tumblrwks');
var fs             = require('fs');
var os             = require('os');
var multer         = require('multer');
var passport       = require('passport');
var TumblrStrategy = require('passport-tumblr').Strategy;
var clone          = require("nodegit").Clone.clone;
var open           = require("nodegit").Repository.open;

var swig = require('swig');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var methodOverride = require('method-override');
var expressSession = require('express-session');

var REPO_PATH         = "./tmp/repo";
var GEOJSON_FILE_PATH = REPO_PATH + "/doors.geojson";
var SITE_URL          = process.env.DEV ? "http://localhost:5000" : "http://doors-of-hamburg.heroku.com";

var app = express();

// configure Express
app.engine('html', swig.renderFile);

app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.set('port', (process.env.PORT || 5000));

app.use(multer({dest: './tmp'}));

app.use(morgan());
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(expressSession({ secret: process.env.SESSION_SECRET }));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(__dirname + '/public'));

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new TumblrStrategy({
    consumerKey: process.env.TUMBLR_OAUTH_KEY,
    consumerSecret: process.env.TUMBLR_OAUTH_SECRET,
    callbackURL: SITE_URL + "/auth/tumblr/callback"
  },
  function(token, tokenSecret, profile, done) {
    return done(null, {token: token, secret: tokenSecret});
  }
));

var repo;

fs.stat(REPO_PATH, function(err, stat){
  if (err) { // Repo doesn't exist
    var cloneOptions = {};

    if (os.platform() === 'darwin') {
      // OSX has an issue with https
      cloneOptions.remoteCallbacks = {
        certificateCheck: function() { return 1; }
      };
    }

    repo = clone("https://github.com/nLight/doors-of-hamburg.git", REPO_PATH, cloneOptions)
      .catch(function(err) { console.log(err); });
  }
  else {
    repo = open(REPO_PATH);
  }
});

// -------- App
app.get('/', function(request, response) {
  response.render('index', { user: request.user });
});

app.get('/auth/tumblr',
  passport.authenticate('tumblr'));

app.get('/auth/tumblr/callback',
  passport.authenticate('tumblr', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });

app.post('/queue', function(req, res) {
  var tumblr = new Tumblr(
    {
      consumerKey:    process.env.TUMBLR_OAUTH_KEY,
      consumerSecret: process.env.TUMBLR_OAUTH_SECRET,
      accessToken:    req.user.token,
      accessSecret:   req.user.secret
    }, "doors-of-hamburg.tumblr.com"
  );

  var jsonData = JSON.parse(fs.readFileSync(GEOJSON_FILE_PATH));

  req.files.photo.forEach(function(file) {
    // Send post to queue
    var photo = fs.readFileSync(file.path);
    var postData = {
      type: 'photo',
      data: [photo],
      tags: "door, Hamburg",
      state: "queue"
    };

    tumblr.post('/post', postData, function(err, json) {
      console.log(err);
      console.log(json);
    });

    // Extract geojson from a file
    geojson.processImage(file.path, function(geojsonFeature) {
      if (geojsonFeature) {
        jsonData.features.push(geojsonFeature);
      }
    });
  });

  // Write new json file
  fs.writeFileSync(GEOJSON_FILE_PATH, JSON.stringify(jsonData, null, 2));

  // Commit geojson to Github
  // Portier.commit();

  // Push

  res.redirect("/");
});

app.listen(app.get('port'), function() {
  console.log("Portier is running on port:" + app.get('port'))
})
