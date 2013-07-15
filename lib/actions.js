var url = require('url');
var util = require('util');

var Push = require('./push');
var User = require('./user');
var version = require('../package.json').version;

var request = require('request');
var _ = require('underscore');
var async = require('async');

var actions = module.exports = {};

// TODO: config
var organization = '<org>';
var user = '<user>';
var password = '<pw>';


var apiRoot = 'https://api.github.com';
var orgEvents = 'users/%s/events/orgs/%s';
var repoCommits = 'repos/%s/%s/commits/%s'; // /repos/:owner/:repo/commits/:sha

var urls = {
	orgEvents: url.resolve(apiRoot, util.format(orgEvents, user, organization)),
	repoCommits: url.resolve(apiRoot, util.format(repoCommits, organization))
};

function toBase64(str) {
	return (new Buffer(str || '', 'ascii')).toString('base64');
}

var headers = {
	authorization: 'Basic ' + toBase64(user + ':' + password),
	'user-agent': 'Pristmatic/' + version,
	accept: 'application/vnd.github.v3.diff' // [+json]
};

var users = {};

function makeMultiPageFetch(url, pages) {
	var fetches = {};
	_.each(_.range(pages), function (page) {
		fetches['page' + page] = function (callback) {
			request({ uri: url + '?page=' + page, headers: headers }, callback);
		};
	});
	return fetches;
}

function formatBranchName(ref) {
	return ref.replace('refs/heads/', '');
}

actions.getOrgCommits = function (req, res) {
	async.parallel(makeMultiPageFetch(urls.orgEvents, 5), function (err, responses) {
		var repoPushMap = {};
		var first = 0;
		var last = 0;
		_.each(responses, function (response, key) {
			_.each(JSON.parse(response[1]), function (event) {
				if (event.type !== 'PushEvent') {
					return;
				}
				var repoName = event.repo.name.split('/')[1];
				var login = event.actor.login;
				var user = users[login] || new User(login, event.actor.url, event.actor.avatar_url);

				if (!repoPushMap[repoName]) {
					repoPushMap[repoName] = {
						name: repoName,
						pushes: []
					};
				}
				repoPushMap[repoName].pushes.push(new Push(repoName, user, event.created_at, event.payload.commits, formatBranchName(event.payload.ref)));
				var epoch = Date.parse(event.created_at);
				if (!first || epoch < first) {
					first = epoch;
				}
				if (!last || epoch > last) {
					last = epoch;
				}
			});
		});
		//console.log(repoPushMap);
		res.json({
			map: _.sortBy(repoPushMap, 'name'),
			start: first,
			end: last
		});
	});
};

actions.getCommitDiff = function (req, res) {
	var diffUrl = util.format(urls.repoCommits, req.params.repo, req.params.sha);
	request({ uri: diffUrl, headers: headers }, function (err, response, body) {
		//console.log('body', JSON.stringify(JSON.parse(body), null, 2))
		res.send({ "patch": String(body) });
	});
};