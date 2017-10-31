var express = require('express');
var engine = require('ejs-locals');
var request = require('request');
var githubApi = require('./lib/githubApi');
var actions = require('./lib/actions');

var app = express();

app.engine('ejs', engine);
app.set('view engine', 'ejs');

app.use(express.compress());
app.use(express.json());
app.use(express.urlencoded());
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
		process.exit(1);
	}
	console.log('github auth via registered oauth application');
	app.use(require('./lib/everyauth')(id, secret));
}

app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/dist'));

app.get('/', function (req, res) {
	res.redirect('/lanes');
});

function loadUserOrganizations(req, res, next) {
	if (req.user && !req.user.organizations) {
		request(githubApi.organizations(req.user, req.session.authToken), function (err, response, body) {
			req.user.organizations = body;
			next();
		});
	} else {
		next();
	}
}

function checkAuth401(req, res, next) {
	if (!req.user) {
		res.send(401);
	} else {
		next();
	}
}

app.get('/list', loadUserOrganizations, function (req, res) {
	res.render('list');
});
app.get('/lanes', loadUserOrganizations, function (req, res) {
	res.render('list');
});

// api
app.get('/a/organization/:organization/events', actions.getOrgEvents);
app.get('/a/user/events', checkAuth401, actions.getUserEvents);

app.use(function handleError(err, req, res, next) { // eslint-disable-line no-unused-vars
	console.error(err.stack);
	res.send(500);
});

module.exports = app;
