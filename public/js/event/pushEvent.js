const util = require('../util');

function PushEvent(event) {
	this.event = event;

	this.id = event.payload.push_id;
	this.repo = event.repo.name;
	this.user = {
		login: event.actor.login,
		url: event.actor.url,
		image: event.actor.avatar_url
	};
	this.date = event.created_at;
	this.commits = event.payload.commits;
	this.size = this.commits.length;
	this.branch = event.payload.ref.replace('refs/heads/', '');
	this.head = event.payload.head;
	this.before = event.payload.before;
}

PushEvent.prototype.link = function () {
	if (this.size < 2) {
		return 'https://github.com/' + this.repo + '/commit/' + this.head;
	}
	return 'https://github.com/' + this.repo + '/compare/' + this.before + '...' + this.head;
};

PushEvent.prototype.linkLabel = function () {
	return this.size + (this.size === 1 ? ' commit' : ' commits');
};

PushEvent.prototype.message = function () {
	return _.map(this.commits, function (commit) {
		return '‣ ' + commit.message;
	}).join('\n');
};

PushEvent.prototype.tooltip = function () {
	return util.makeTooltip.call(this, { branch: true });
};

PushEvent.prototype.combine = function (push) {
	if (push instanceof PushEvent && push.repo === this.repo && push.user.login === this.user.login && push.bucket === this.bucket && push.branch === this.branch) {
		var combined = new PushEvent(this.event);
		combined.bucket = this.bucket;
		combined.commits = push.commits.concat(this.commits);
		combined.before = push.before;
		combined.size = combined.commits.length;
		return combined;
	}
	return false;
};

PushEvent.prototype.icon = function () {
	return this.branch && this.branch !== 'master' && 'octicon-git-branch';
};

module.exports = PushEvent;
