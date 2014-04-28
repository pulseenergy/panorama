var _ = require('underscore');
var url = require('url');
var everyauth = require('everyauth');

module.exports = function (id, secret) {
	everyauth.everymodule.findUserById(function (req, id, callback) {
		callback(null, req.session.auth.github.user);
	});

	everyauth.debug = true;

	everyauth.github
		.scope('repo') // require read access to private repos
		.appId(id)
		.appSecret(secret)
		.entryPath('/auth/github')
		.callbackPath('/auth/github/callback')
		.findOrCreateUser(function (session, accessToken, accessTokenExtra, githubUserMetadata) {
			session.authToken = accessToken; // shortcut for session.auth.github.accessToken
			return githubUserMetadata;
		})
		.handleAuthCallbackError(function (req, res) {
			// override to avoid jade dependency in github module
			var parsedUrl = url.parse(req.url, true);
			res.render('authfail', {
				errorDescription: _.compact([parsedUrl.query.error, parsedUrl.query.error_description]).join('; ')
			});
		})
		.redirectPath('/');

	return everyauth.middleware();
};
