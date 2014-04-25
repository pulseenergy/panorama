var util = require('util');
var request = require('request');
var _ = require('underscore');
var async = require('async');

var Push = require('./push');
var User = require('./user');
var githubApi = require('./githubApi');

var actions = module.exports = {};

function makeMultiPageFetch(requestOptions, pages) {
	var fetches = {};
	_.each(_.range(1,pages+1), function (page) {
		fetches['page' + page] = function (callback) {
			var paged = _.extend({}, requestOptions, { url: requestOptions.url + '?page=' + page });
			request(paged, callback);
		};
	});
	return fetches;
}

var DEFAULT_PAGES = 5;

actions.getOrgCommits = function (req, res) {
	return commitsResponse(req, res, githubApi.orgEvents(req.user, req.params.organization, req.session.authToken));
};

actions.getUserCommits = function (req, res) {
	return commitsResponse(req, res, githubApi.userEvents(req.user, req.session.authToken));
};

function commitsResponse(req, res, apiRequest) {
	async.parallel(makeMultiPageFetch(apiRequest, DEFAULT_PAGES), function (err, results) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		var pushes = [];
		var first = 0;
		var last = 0;

		_.each(_.range(1,DEFAULT_PAGES+1), function (page) {
			var response = results['page' + page][0];
			var body = results['page' + page][1];
			if (!body || response.statusCode !== 200) {
				console.error('error fetching page ' + page, response.statusCode, response.body);
				return;
			}
			_.each(JSON.parse(body), function (event) {
				if (event.type !== 'PushEvent') {
					// TODO: return all events, but client filters
					return;
				}
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
			});
		});
		res.json({
			pushes: pushes,
			start: first,
			end: last
		});
	});
}
