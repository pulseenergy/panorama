var express = require('express');
var actions = require('./lib/actions');

var app = express();
app.get('/', function (req, res, next) {
	req.url = '/index.html';
	next();
});
app.get('/pushes', actions.getOrgCommits);
app.get('/diff/:repo/:sha', actions.getCommitDiff);
app.use(express.static(__dirname + '/public'));
module.exports = app;
