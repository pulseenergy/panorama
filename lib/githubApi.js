var _ = require('underscore');
var url = require('url');
var util = require('util');
var package = require('../package.json');

function makeHeaders(token) {
	return {
		'authorization': 'token ' + token,
		'user-agent': [package.name, package.version].join('/'),
//		'accept': 'application/vnd.github.v3.diff' // [+json]
	};
}

var apiUrls = {
	root: 'https://api.github.com',
	orgEvents: 'users/%s/events/orgs/%s', // users/:user/events/orgs/:org
	repoCommits: 'repos/%s/%s/commits/%s' // repos/:owner/:repo/commits/:sha	
};

var organization = 'pulseenergy'; // TODO: user selection (fetch options from user.organizations_url)

var api = module.exports = {
	orgEvents: function (user, token) {
		return {
			url: url.resolve(apiUrls.root, util.format(apiUrls.orgEvents, user.login, organization)),
			headers: makeHeaders(token)
		};
	},
	repoCommits: function (repo, sha, token) {
		return {
			url: url.resolve(apiUrls.root, util.format(apiUrls.repoCommits, organization, repo, sha)),
			headers: makeHeaders(token)
		};
	}
};