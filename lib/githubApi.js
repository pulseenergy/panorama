var _ = require('underscore');
var url = require('url');
var util = require('util');
var json = require('../config.json');

var required = ['organization', 'user', 'password'];
_.each(required, function (prop) {
	if (!json[prop]) {
		console.error('required option missing from config.json: ' + prop);
		process.exit(1);
	}

});

var package = require('../package.json');

function toBase64(str) {
	return (new Buffer(str || '', 'ascii')).toString('base64');
}

var headers = {
	'authorization': 'Basic ' + toBase64(json.user + ':' + json.password),
	'user-agent': [package.name, package.version].join('/'),
	'accept': 'application/vnd.github.v3.diff' // [+json]
};

var apiUrls = {
	root: 'https://api.github.com',
	orgEvents: 'users/%s/events/orgs/%s', // users/:user/events/orgs/:org
	repoCommits: 'repos/%s/%s/commits/%s' // repos/:owner/:repo/commits/:sha	
};

var api = module.exports = {
	orgEvents: function () {
		return {
			url: url.resolve(apiUrls.root, util.format(apiUrls.orgEvents, json.user, json.organization)),
			headers: headers
		};
	},
	repoCommits: function (repo, sha) {
		return {
			url: url.resolve(apiUrls.root, util.format(apiUrls.repoCommits, json.organization, repo, sha)),
			headers: headers
		};
	}
};