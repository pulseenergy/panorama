const _ = require('underscore');
const util = require('../util');

function WikiEvent(event) {
	this.event = event;

	this.id = event.id;
	this.repo = event.repo.name;
	this.user = {
		login: event.actor.login,
		url: event.actor.url,
		image: event.actor.avatar_url
	};
	this.date = event.created_at;
	this.pages = event.payload.pages;
	this.size = this.pages.length;
	this.branch = null; // ???
}

WikiEvent.prototype.link = function () {
	return this.pages[0].html_url;
};

WikiEvent.prototype.linkLabel = function () {
	return this.pages[0].action + ' wiki page';
};

WikiEvent.prototype.message = function () {
	return _.map(this.pages, function (page) {
		return '‣ ' + page.action + ' wiki page ' + page.title;
	}).join('\n');
};

WikiEvent.prototype.tooltip = function () {
	return util.makeTooltip.call(this);
};

WikiEvent.prototype.combine = function (push) {
	if (push instanceof WikiEvent && push.repo === this.repo && push.user.login === this.user.login && push.bucket === this.bucket) {
		var combined = new WikiEvent(this.event);
		combined.bucket = this.bucket;
		combined.pages = push.pages.concat(this.pages);
		combined.size = combined.pages.length;
		return combined;
	}
	return false;
};

WikiEvent.prototype.icon = function () {
	return 'octicon-book';
};

module.exports = WikiEvent;
