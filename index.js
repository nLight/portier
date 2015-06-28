var express = require('express');
var geojson = require('exif-to-geojson');
var Tumblr  = require('tumblrwks');
var fs      = require('fs');

var clone   = require("nodegit").Clone.clone;
var open    = require("nodegit").Repository.open;

var app = express();

var tumblr = new Tumblr(
  {
    consumerKey: 'your consumer key',
    consumerSecret: 'your consumer secret',
    accessToken: 'access token',
    accessSecret: 'access secret'
  }, "doors-of-hamburg.tumblr.com"
);

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
  fs.stat('./tmp/repo', function(err, stat){

    if (err) {
      var cloneOptions = {};
      cloneOptions.remoteCallbacks = {
        certificateCheck: function() { return 1; }
      };

      clone("https://github.com/nLight/doors-of-hamburg.git", "./tmp/repo", cloneOptions)
        .catch(function(err) { console.log(err); });
    }

    open("./tmp/repo")
      .then(function(repo) {
        return repo.getMasterCommit();
      })
      // Display information about commits on master.
      .then(function(firstCommitOnMaster) {
        // Create a new history event emitter.
        var history = firstCommitOnMaster.history();

        // Create a counter to only show up to 9 entries.
        var count = 0;

        // Listen for commit events from the history.
        history.on("commit", function(commit) {
          // Disregard commits past 9.
          if (++count >= 9) {
            return;
          }

          // Show the commit sha.
          console.log("commit " + commit.sha());

          // Store the author object.
          var author = commit.author();

          // Display author information.
          console.log("Author:\t" + author.name() + " <", author.email() + ">");

          // Show the commit date.
          console.log("Date:\t" + commit.date());

          // Give some space and show the message.
          console.log("\n    " + commit.message());
        });

        // Start emitting events.
        history.start();
      });
  });
  
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
