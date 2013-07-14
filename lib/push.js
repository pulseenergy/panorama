function Push(user, date, commits, branch) {
	this.user = user;
	this.date = date;
	this.commits = commits;
	this.size = commits.length;
	this.branch = branch;
}

module.exports = Push;