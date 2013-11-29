var express = require('express');
var everyauth = require('everyauth');
var url = require('url');
var _ = require('underscore');
var actions = require('./lib/actions');

var app = express();

everyauth.everymodule.findUserById(function (req, id, callback) {
	callback(null, req.session.auth.github.user);
});

everyauth.debug = true;

everyauth.github
	.scope('repo') // require read access to private repos
	.appId('49822a7be3b18eb22d54')
	.appSecret('4d28a5ca6f508d269832241cad0a4d3e6f031b5a')
	.entryPath('/auth/github')
	.callbackPath('/auth/github/callback')
	.findOrCreateUser( function (session, accessToken, accessTokenExtra, githubUserMetadata) {
		session.authToken = accessToken; // shortcut for session.auth.github.accessToken
		return githubUserMetadata;
	})
	.handleAuthCallbackError( function (req, res) {
		// override to avoid jade dependency in github module
		var parsedUrl = url.parse(req.url, true);
		res.render('authfail', {
			errorDescription: _.compact([parsedUrl.query.error, parsedUrl.query.error_description]).join('; ')
		});
	})
	.redirectPath('/');

app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'f8fb234f3cf333241e3f7c74' }));
app.use(everyauth.middleware());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.render('index');
});

function checkAuth(req, res, next) {
	if (!req.user) {
		return res.send(401);
	}
	next();
}
app.get('/pushes', checkAuth, actions.getOrgCommits);
app.get('/diff/:repo/:sha', checkAuth, actions.getCommitDiff);

app.use(function handleError(err, req, res, next) {
	console.error(err.stack);
	res.send(500);
});

module.exports = app;
