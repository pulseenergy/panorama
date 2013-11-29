var _ = require('underscore');
var url = require('url');
var util = require('util');
var pkg = require('../package.json');

function makeRequest(url, accessToken) {
	return {
		url: url,
		headers: {
			'authorization': 'token ' + accessToken,
			'user-agent': [pkg.name, pkg.version].join('/'),
			'accept': 'application/vnd.github.v3.diff' // [+json]
		}
	};
}

var apiUrls = {
	root: 'https://api.github.com',
	orgs: 'users/%s/orgs',
	orgEvents: 'users/%s/events/orgs/%s', // users/:user/events/orgs/:org
	repoCommits: 'repos/%s/%s/commits/%s' // repos/:owner/:repo/commits/:sha
};

var api = module.exports = {
	organizations: function (user, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.orgs, user.login)), token);
	},
	orgEvents: function (user, org, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.orgEvents, user.login, org)), token);
	},
	repoCommits: function (repo, org, sha, token) {
		return makeRequest(url.resolve(apiUrls.root, util.format(apiUrls.repoCommits, org, repo, sha)), token);
	}
};