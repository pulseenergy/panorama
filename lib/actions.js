var util = require('util');
var request = require('request');
var _ = require('underscore');
var async = require('async');

var Push = require('./push');
var User = require('./user');
var githubApi = require('./githubApi');

var actions = module.exports = {};

actions.preferences = function (req, res) {
	console.log('fetching organization');
	request(githubApi.organizations(req.user, req.session.authToken), function (err, response, body) {
		var parsed = JSON.parse(body);
		if (!parsed.length) {
			return res.send('No organizations available', 400);
		}
		req.user.org = _.first(parsed).login;
		res.redirect('/list');
	});
};

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
var userCache = {};

actions.getOrgCommits = function (req, res) {
	var organization = req.user.org;
	var apiRequest = githubApi.orgEvents(req.user, organization, req.session.authToken);
	async.parallel(makeMultiPageFetch(apiRequest, DEFAULT_PAGES), function (err, results) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		var repoPushMap = {};
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
				var repoName = event.repo.name.split('/')[1];
				var login = event.actor.login;
				var user = userCache[login] || new User(login, event.actor.url, event.actor.avatar_url);

				if (!repoPushMap[repoName]) {
					repoPushMap[repoName] = {
						name: repoName,
						pushes: []
					};
				}
				var push = new Push(event.payload.push_id, repoName, user, event.created_at, event.payload.commits, event.payload.ref, event.payload.head, event.payload.before);
				pushes.push(push);
				repoPushMap[repoName].pushes.push(push);
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
			map: _.sortBy(repoPushMap, 'name'),
			pushes: pushes,
			organization: organization,
			start: first,
			end: last
		});
	});
};

actions.getCommitDiff = function (req, res) {
	request(githubApi.repoCommits(req.params.repo, req.params.sha, req.session.authToken), function (err, response, body) {
		//console.log('body', JSON.stringify(JSON.parse(body), null, 2))
		res.send({ "patch": String(body) });
	});
};