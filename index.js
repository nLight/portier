var express = require('express');
var geojson = require('exif-to-geojson');
var Tumblr  = require('tumblrwks');
var Github  = require('github');

var app = express();

var tumblr = new Tumblr(
  {
    consumerKey: 'your consumer key',
    consumerSecret: 'your consumer secret',
    accessToken: 'access token',
    accessSecret: 'access secret'
  }, "doors-of-hamburg.tumblr.com"
);

var photo = fs.readFileSync('./test/img/P1010486.jpg');

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  response.send("Ok!");
});

app.post('/queue', function(request, response) {
  // Extract geojson from a file
  geojson.processImage();
  // Send post to queue
  tumblr.post('/post', {type: 'photo', data: [photo]}, function(err, json){

  });
  // Commit geojson to Github

  response.send();
});

app.listen(app.get('port'), function() {
  console.log("Portier is running on port:" + app.get('port'))
})
