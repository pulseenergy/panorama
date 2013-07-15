function Push(id, repo, user, date, commits, branch) {
	this.id = id;
	this.repo = repo;
	this.user = user;
	this.date = date;
	this.commits = commits;
	this.size = commits.length;
	this.branch = branch;
}

module.exports = Push;