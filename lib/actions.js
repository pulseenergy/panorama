var util = require('util');
var request = require('request');
var _ = require('underscore');
var async = require('async');

var Push = require('./push');
var User = require('./user');
var githubApi = require('./githubApi');

var actions = module.exports = {};

function multiPageFetch(requestOptions, pages, done) {
	async.parallel(_.range(1, pages + 1).map(function (page) {
		return function (done) {
			request(_.extend({}, requestOptions, { url: requestOptions.url + '?page=' + page }), function (err, res, body) {
				if (err) {
					done(err);
				} if (res.statusCode !== 200) {
					done(new Error('Status ' + res.statusCode));
				} else {
					done(null, body);
				}
			});
		};
	}), function (err, pages) {
		if (err) {
			done(err);
		} else {
			done(null, pages.reduce(function (acc, page) {
				return acc.concat(page);
			}));
		}
	});
}

var DEFAULT_PAGES = 5;

actions.getOrgCommits = function (req, res) {
	return commitsResponse(req, res, githubApi.orgEvents(req.user, req.params.organization, req.session.authToken));
};

actions.getUserCommits = function (req, res) {
	return commitsResponse(req, res, githubApi.userEvents(req.user, req.session.authToken));
};

actions.getOrgEvents = function (req, res) {
	return eventsResponse(req, res, githubApi.orgEvents(req.user, req.params.organization, req.session.authToken));
};

actions.getUserEvents = function (req, res) {
	return eventsResponse(req, res, githubApi.userEvents(req.user, req.session.authToken));
};

function eventsResponse(req, res, apiRequest) {
	multiPageFetch(apiRequest, DEFAULT_PAGES, function (err, results) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		res.json(results);
	});
}

function commitsResponse(req, res, apiRequest) {
	multiPageFetch(apiRequest, DEFAULT_PAGES, function (err, results) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		var pushes = [];
		var first = 0;
		var last = 0;

		_.each(results, function (event) {
			if (event.type === 'PushEvent') {
				var repoName = event.repo.name;
				var login = event.actor.login;
				var user = new User(login, event.actor.url, event.actor.avatar_url);

				pushes.push(new Push(event.payload.push_id, repoName, user, event.created_at, event.payload.commits, event.payload.ref, event.payload.head, event.payload.before));
				var epoch = Date.parse(event.created_at);
				if (!first || epoch < first) {
					first = epoch;
				}
				if (!last || epoch > last) {
					last = epoch;
				}
			}
		});
		res.json({
			pushes: pushes,
			start: first,
			end: last
		});
	});
}
