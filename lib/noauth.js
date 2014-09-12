var request = require('request');
var githubApi = require('./githubApi');

function settable() {
	var value;
	var waiting = [];

	return {
		get: function (cb) {
			if (waiting) {
				waiting.push(cb);
			} else {
				cb(value);
			}
		},
		set: function (v) {
			waiting.forEach(function (cb) {
				cb(v);
			});
			value = v;
			waiting = null;
		}
	};
}

module.exports = function (token) {
	var user = settable();

	request(githubApi.user(token), function (err, response, body) {
		user.set(body);
	});

	return function (req, res, next) {
		user.get(function (user) {
			req.user = user;
			req.session.authToken = token;

			if (res.locals) {
				res.locals.everyauth = {
					loggedIn: !!req.user
				};
				res.locals.user = req.user;
			}
			next();
		});
	};
};
