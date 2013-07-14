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

var urls = {
	orgEvents: url.resolve(apiRoot, util.format(orgEvents, user, organization))
};

function toBase64(str) {
	return (new Buffer(str || '', 'ascii')).toString('base64');
}

var headers = {
	authorization: 'Basic ' + toBase64(user + ':' + password),
	'user-agent': 'Pristmatic/' + version
};

actions.getOrgCommits = function (req, res) {

	// only up to 10 pages
	request({ uri: urls.orgEvents, headers: headers }, function (err, response, body) {
		console.log(response.headers);
		var repos = {};
		var users = {};
		var repoPushMap = {};

		_.each(JSON.parse(body), function (event) {
			if (event.type !== 'PushEvent') {
				return;
			}
			var repoName = event.repo.name.split('/')[1];
			if (!repos[repoName]) {
				repos[repoName] = {
					name: repoName,
					url: event.repo.url
				};
			}

			var login = event.actor.login;
			var user = users[login] || new User(login, event.actor.url, event.actor.avatar_url);

			if (!repoPushMap[repoName]) {
				repoPushMap[repoName] = [];
			}
			repoPushMap[repoName].push(new Push(user, event.created_at, event.payload.commits, event.payload.ref));
		});

		//console.log('map', JSON.stringify(repoPushMap, null, 2));
		res.json(repoPushMap);
	});

};