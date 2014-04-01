var express = require('express');
var url = require('url');
var _ = require('underscore');
var actions = require('./lib/actions');

var app = express();

app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'f8fb234f3cf333241e3f7c74' }));

if (process.env.GITHUB_API_TOKEN) {
	var request = require('request');
	var githubApi = require('./lib/githubApi');

	function settable() {
		var value;
		var waiting = [];

		return {
			get: function (cb) {
				if (waiting) {
					waiting.push(cb);
				} else {
					cb(value);
				}
			},
			set: function (v) {
				waiting.forEach(function (cb) {
					cb(v);
				});
				value = v;
				waiting = null;
			}
		};
	}

	var token = process.env.GITHUB_API_TOKEN;
	var user = settable();

	request(githubApi.user(token), function (err, response, body) {
		user.set(JSON.parse(body));
	});

	app.use(function (req, res, next) {
		user.get(function (user) {
			req.user = user;
			req.session.authToken = token;

			if (res.locals) {
				res.locals.everyauth = {
					loggedIn: !!req.user
				};
				res.locals.user = req.user;
			}
			next();
		});
	});
} else {
	var everyauth = require('everyauth');

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
	app.use(everyauth.middleware());
}

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
