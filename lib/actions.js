var request = require('request');
var _ = require('underscore');
var async = require('async');

var githubApi = require('./githubApi');

var actions = module.exports = {};

function multiPageFetch(requestOptions, pages, done) {
	async.parallel(_.range(1, pages + 1).map(function (page) {
		return function (done) {
			var thisRequestOptions = _.extend({}, requestOptions);
			thisRequestOptions.qs = _.extend({}, thisRequestOptions.qs, { page: page });

			request(thisRequestOptions, function (err, res, body) {
				if (res && res.headers['x-ratelimit-remaining']) {
					console.log('GitHub API rate limit: %s/%s', res.headers['x-ratelimit-remaining'], res.headers['x-ratelimit-limit']);
				}
				if (err) {
					done(err);
				} else if (res.statusCode !== 200) {
					done(new Error('Status ' + res.statusCode));
				} else {
					done(null, body);
				}
			});
		};
	}), function (err, pages) {
		if (err) {
			done(err);
		} else {
			done(null, pages.reduce(function (acc, page) {
				return acc.concat(page);
			}));
		}
	});
}

var DEFAULT_PAGES = 5;

actions.getOrgEvents = function (req, res) {
	multiPageFetch(githubApi.orgEvents(req.user, req.params.organization, req.session.authToken), DEFAULT_PAGES, function (err, organizationEvents) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		res.json(organizationEvents);
	});
};

actions.getUserEvents = function (req, res) {
	multiPageFetch(githubApi.userReceivedEvents(req.user, req.session.authToken), DEFAULT_PAGES, function (err, receivedEvents) {
		if (err) {
			console.error(err);
			return res.send(500);
		}
		res.json(receivedEvents);
//		multiPageFetch(githubApi.userEvents(req.user, req.session.authToken), 2, function (err, userEvents) {
//			if (err) {
//				console.error(err);
//				return res.send(500);
//			}
//			var events = userEvents.concat(receivedEvents);
//			events = _.sortBy(events, 'created_at').reverse();
//			res.json(events);
//		});
	});
};