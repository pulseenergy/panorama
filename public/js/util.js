const moment = require('moment');

function makeTooltip(options = {}) {
	var text = moment(this.date).fromNow();
	if (options.branch && this.branch && this.branch !== 'master') {
		text += ' on ' + this.branch;
	}
	text += ' by ' + this.user.login + '\n';
	if (options.repo) {
		text += this.repo + '\n';
	}
	return text + this.message();
}

exports.makeTooltip = makeTooltip;
