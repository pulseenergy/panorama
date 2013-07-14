var express = require('express');
var actions = require('./lib/actions');


var app = express();
app.get('/', function (req, res) {
	res.send(200);
});
app.get('/pushes', actions.getOrgCommits);
app.get('/diff/:repo/:sha', actions.getCommitDiff);
app.use(express.static(__dirname + '/public'));
module.exports = app;
