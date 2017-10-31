const util = require('../util');

function CommentEvent(event) {
	this.event = event;

	this.id = event.payload.comment.id;
	this.repo = event.repo.name;
	this.user = {
		login: event.actor.login,
		url: event.actor.url,
		image: event.actor.avatar_url
	};
	this.date = event.created_at;
	this.size = 0;
	this.branch = null; // ???
	this.head = event.payload.comment.commit_id;
	this.before = event.payload.comment.commit_id;
}

CommentEvent.prototype.link = function () {
	return this.event.payload.comment.html_url;
};

CommentEvent.prototype.linkLabel = function () {
	return '1 comment';
};

CommentEvent.prototype.message = function () {
	return '‣ ' + this.event.payload.comment.body;
};

CommentEvent.prototype.tooltip = function () {
	return util.makeTooltip.call(this, { branch: true });
};

CommentEvent.prototype.combine = function () {
	return false;
};

CommentEvent.prototype.icon = function () {
	return 'octicon-comment';
};

module.exports = CommentEvent;
