var express = require('express');
var request = require('request');
var githubApi = require('./lib/githubApi');
var actions = require('./lib/actions');

var app = express();

app.set('view engine', 'ejs');

app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({ secret: 'f8fb234f3cf333241e3f7c74' }));

if (process.env.GITHUB_API_TOKEN) {
	var token = process.env.GITHUB_API_TOKEN;
	console.log('github auth via personal access token');
	app.use(require('./lib/noauth')(token));
} else {
	var id = process.env.GITHUB_APP_ID;
	var secret = process.env.GITHUB_APP_SECRET;
	if (!id || !secret) {
		console.error('github auth environment variables not found -- see README');
		return process.exit(1);
	}
	console.log('github auth via registered oauth application');
	app.use(require('./lib/everyauth')(id, secret));
}

app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	if (!req.user) {
		res.render('login');
	} else {
		res.redirect('/list');
	}
});

function checkAuthLogin(req, res, next) {
	if (!req.user) {
		return res.redirect('/');
	}
	if (!req.user.organizations) {
		return request(githubApi.organizations(req.user, req.session.authToken), function (err, response, body) {
			req.user.organizations = body;
			next();
		});
	}
	next();
}

function checkAuth401(req, res, next) {
	if (!req.user) {
		return res.send(401);
	}
	next();
}

app.get('/list', checkAuthLogin, function (req, res) {
	res.render('list');
});
app.get('/lanes', checkAuthLogin, function (req, res) {
	res.render('lanes');
});

// api
app.get('/a/organization/:organization/events', checkAuth401, actions.getOrgEvents);
app.get('/a/user/events', checkAuth401, actions.getUserEvents);

app.use(function handleError(err, req, res, next) {
	console.error(err.stack);
	res.send(500);
});

module.exports = app;
