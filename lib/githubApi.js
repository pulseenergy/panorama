var url = require('url');
var util = require('util');
var _ = require('underscore');

var pkg = require('../package.json');
var userAgent = [pkg.name, pkg.version].join('/');

function makeRequest(url, accessToken) {
	var headers = {
		'user-agent': userAgent,
		'accept': 'application/vnd.github.v3+json'
	};
	if (accessToken) {
		headers.authorization = 'token ' + accessToken;
	}
	return {
		url: url,
		headers: headers,
		json: true
	};
}

var apiUrls = {
	root: 'https://api.github.com',
	user: 'user',
	orgs: 'users/%s/orgs',
	userEvents: 'users/%s/events',
	userReceivedEvents: 'users/%s/received_events',
	orgEvents: 'users/%s/events/orgs/%s', // users/:user/events/orgs/:org
	repoCommits: 'repos/%s/%s/commits/%s' // repos/:owner/:repo/commits/:sha
};

module.exports = {
	user: function (token) {
		return makeRequest(url.resolve(apiUrls.root, apiUrls.user), token);
	},
	organizations: function (user, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.orgs, user.login)), token);
	},
	userEvents: function (user, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.userEvents, user.login)), token);
	},
	userReceivedEvents: function (user, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.userReceivedEvents, user.login)), token);
	},
	orgEvents: function (user, org, token) {
		var path;
		if (user && _.any(user.organizations, function (organization) {
				return organization.login === org;
			})) {
			path = util.format("users/%s/events/orgs/%s", user.login, org);
		} else {
			path = util.format("orgs/%s/events", org);
			var id = process.env.GITHUB_APP_ID;
			var secret = process.env.GITHUB_APP_SECRET;
			if (id && secret) {
				path += '?client_id=' + id + '&client_secret=' + secret;
			}
		}
		return makeRequest(url.resolve(apiUrls.root, path), token);
	},
	repoCommits: function (repo, org, sha, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.repoCommits, org, repo, sha)), token);
	}
};