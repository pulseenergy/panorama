const util = require('../util');

function TagEvent(event) {
	this.event = event;

	this.id = event.id;
	this.repo = event.repo.name;
	this.user = {
		login: event.actor.login,
		url: event.actor.url,
		image: event.actor.avatar_url
	};
	this.date = event.created_at;
	this.size = 0;
	this.branch = event.payload.ref;
}

TagEvent.prototype.link = function () {
	return 'https://github.com/' + this.repo + '/tree/' + this.event.payload.ref;
};

TagEvent.prototype.linkLabel = function () {
	return 'new tag';
};

TagEvent.prototype.message = function () {
	return '‣ created tag ' + this.event.payload.ref;
};

TagEvent.prototype.tooltip = function () {
	return util.makeTooltip.call(this);
};

TagEvent.prototype.combine = function () {
	return false;
};

TagEvent.prototype.icon = function () {
	return 'octicon-tag';
};

module.exports = TagEvent;
