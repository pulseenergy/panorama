const util = require('../util');

function BranchEvent(event) {
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

BranchEvent.prototype.link = function () {
	return 'https://github.com/' + this.repo + '/tree/' + this.event.payload.ref;
};

BranchEvent.prototype.linkLabel = function () {
	return 'new branch';
};

BranchEvent.prototype.message = function () {
	return '‣ created branch ' + this.event.payload.ref;
};

BranchEvent.prototype.tooltip = function () {
	return util.makeTooltip.call(this);
};

BranchEvent.prototype.combine = function () {
	return false;
};

BranchEvent.prototype.icon = function () {
	return 'octicon-git-branch';
};

module.exports = BranchEvent;
