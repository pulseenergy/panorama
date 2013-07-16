function Push(id, repo, user, date, commits, ref, head, before) {
	this.id = id;
	this.repo = repo;
	this.user = user;
	this.date = date;
	this.commits = commits;
	this.size = commits.length;
	this.branch = formatBranchName(ref);

	this.head = head;
	this.before = before;
}

function formatBranchName(ref) {
	return ref.replace('refs/heads/', '');
}

module.exports = Push;