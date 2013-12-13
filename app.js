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
	.appId(process.env.GITHUB_APP_ID)
	.appSecret(process.env.GITHUB_APP_SECRET)
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
	.redirectPath('/prefs');

app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'f8fb234f3cf333241e3f7c74' }));
app.use(everyauth.middleware());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', renderListView);
app.get('/list', renderListView);

function renderListView(req, res) {
	res.render('list');
}

app.get('/lanes', function (req, res) {
	res.render('lanes');
});

function checkAuth(req, res, next) {
	if (!req.user) {
		return res.send(401);
	}
	next();
}

app.get('/prefs', checkAuth, actions.preferences);

// api
app.get('/a/pushes', checkAuth, actions.getOrgCommits);
app.get('/a/diff/:repo/:sha', checkAuth, actions.getCommitDiff);

app.use(function handleError(err, req, res, next) {
	console.error(err.stack);
	res.send(500);
});

module.exports = app;
