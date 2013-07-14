var url = require('url');
var util = require('util');

var Push = require('./push');
var User = require('./user');
var version = require('../package.json').version;

var request = require('request');
var _ = require('underscore');

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

actions.getOrgCommits = function (req, res) {
	// TODO: pagination (up to ?page=10)
	request({ uri: urls.orgEvents, headers: headers }, function (err, response, body) {
		var repoPushMap = {};

		_.each(JSON.parse(body), function (event) {
			if (event.type !== 'PushEvent') {
				return;
			}
			var repoName = event.repo.name.split('/')[1];
			var login = event.actor.login;
			var user = users[login] || new User(login, event.actor.url, event.actor.avatar_url);

			if (!repoPushMap[repoName]) {
				repoPushMap[repoName] = [];
			}
			repoPushMap[repoName].push(new Push(repoName, user, event.created_at, event.payload.commits, event.payload.ref));
		});

		//console.log('map', JSON.stringify(JSON.parse(body), null, 2));
		res.json(repoPushMap);
	});
};

actions.getCommitDiff = function (req, res) {
	var diffUrl = util.format(urls.repoCommits, req.params.repo, req.params.sha);
	request({ uri: diffUrl, headers: headers }, function (err, response, body) {
		//console.log('body', JSON.stringify(JSON.parse(body), null, 2))
		res.send({ "patch": String(body) });
	});
};