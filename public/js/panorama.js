var Panorama = (function () {
	'use strict';

	var colors = [
		'#807c59',
		'#618059',
		'#73bf60',
		'#ccae8f',
		'#806c59',
		'#bf9060',
		'#65567a',
		'#8860bf',
		'#bfb660',
		'#cc8f8f',
		'#bf6060'
	];

	function sign(n) {
		if (isNaN(n)) {
			return n;
		}
		if (n === 0) {
			return n;
		}
		return n > 0 ? 1 : -1;
	}

	function safeToAppend(url) {
		var sep = '&';
		if (url.indexOf('?') === '-1') {
			sep = '?';
		}
		if (url[url.length - 1] === sep) {
			return url;
		}
		return url + sep;
	}

	function drawLanesSvg(underlay) {
		var overlap = 10;

		underlay.clear();

		var rows = [];
		for (var bucket = 0; ; bucket++) {
			var row = document.querySelectorAll('.pushes.bucket-' + bucket);
			if (!row.length) break;

			rows.push(row);
		}

		var shadow = [];
		rows.forEach(function (row, bucket) {
			shadow[bucket] = [];
			for (var c = 0; c < row.length; c++) {
				var node = row[c];
				shadow[bucket][c] = { node: node, offsetTop: node.offsetTop, marginTop: 0 };
				if (bucket > 0) {
					shadow[bucket - 1][c].next = shadow[bucket][c];
				}
			}
		});

		function bump(s, amount) {
			s.marginTop += amount;
			while (s) {
				s.offsetTop += amount;
				s = s.next;
			}
		}

		var adjusts = 0;
		shadow.forEach(function (row, bucket) {
			for (var c = 0; c < row.length; c++) {
				if (adjusts++ > 5000) {
					console.log('too many layout iterations, aborting');
					return;
				}

				var current = row[c];
				var previous = row[c - 1];

				if (previous) {
					var pt = previous.offsetTop;
					var ct = current.offsetTop;

					var ao = overlap;

					if (c === 1) {
						ao = 0;
					}

					if (ct > (pt + ao)) {
						// bump previous, recursively
						bump(previous, ct - pt - ao);
						c -= 2;
					} else if (ct < (pt - ao)) {
						// bump current, no recursion
						bump(current, pt - ct - ao);
					}
				}
			}
			row.forEach(function (s) {
				s.node.style.marginTop = s.marginTop + 'px';
			});
		});

		function smooth(els, y1, y2, flat) {
			var path = [];
			var slope = 0;
			var c0;

			function append(e, ne, ne2, y, l, r) {
				c0 = [e.xbar + (e[r] - e.xbar) / 2, e[y] - slope / 2]; // left control point
				if (!ne) return false;

				var c1 = [ne[l] + (ne.xbar - ne[l]) / 2, ne[y]]; // right control point
				if (ne2 && !flat && sign(e[y] - ne[y]) === sign(ne[y] - ne2[y])) {
					slope = (e[y] - ne2[y]) / 4;
					// FIXME magic number: 5 for overlap = 10
					slope = Math.max(-5, Math.min(5, slope));
					c1[1] += slope / 2;
				} else {
					slope = 0;
				}
				path.push('C' + c0.join() + ' ' + c1.join() + ' ' + ne.xbar + ',' + ne[y]);
				return true;
			}

			var i, e, ne, ne2;
			for (i = 0; i < els.length; i++) {
				e = els[i];
				ne = els[i + 1];
				ne2 = els[i + 2];

				if (i === 0) {
					if (y2) {
						path.push('M' + e.xbar + ',' + e[y2]);
						path.push('C' + e.xmin + ',' + e[y2] + ' ' + e.xmin + ',' + e[y1] + ' ' + e.xbar + ',' + e[y1]);
					} else {
						path.push('M' + e.xmin + ',' + e[y1]);
						path.push('L' + e.xbar + ',' + e[y1]);
					}
				}

				if (!append(e, ne, ne2, y1, 'xmin', 'xmax')) {
					if (y2) {
						path.push('C' + c0.join() + ' ' + e.xmax + ',' + e[y2] + ' ' + e.xbar + ',' + e[y2]);
					} else {
						path.push('L' + e.xmax + ',' + e[y1]);
					}
				}
			}
			if (y2) {
				for (i = els.length - 1; i > 0; i--) {
					e = els[i];
					ne = els[i - 1];
					ne2 = els[i - 2];
					append(e, ne, ne2, y2, 'xmax', 'xmin');
				}
			}
			return path.join(' ');
		}

		function points(row, inset) {
			return _.map(row, function (e) {
				var xmin = e.offsetLeft + inset;
				var xmax = e.offsetLeft + e.offsetWidth - inset;
				var xbar = e.offsetLeft + e.offsetWidth / 2;
				var ymin = e.offsetTop + inset;
				var ymax = e.offsetTop + e.offsetHeight - inset;
				var ybar = e.offsetTop + e.offsetHeight / 2;
				return { xmin: xmin, xmax: xmax, xbar: xbar, ymin: ymin, ymax: ymax, ybar: ybar };
			});
		}

//		rows.forEach(function (row, bucket) {
//			underlay.path(smooth(points(row, 2.5), 'ymin', 'ymax', false))
//					.fill(colors[bucket % colors.length]);
//		});

		var rowLabels = document.querySelectorAll('.lane-time .push span');
		rows.forEach(function (row, bucket) {
			var context = underlay.path(smooth(points(row, -1).map(function (p) {
				p.ymin += 1;
				return p;
			}), 'ymin', null, false)).fill('none');

			if (rowLabels[bucket].dataset.first !== 'false') {
				context.stroke({
					width: '2px',
					color: colors[bucket % colors.length]
				});
			}
		});
	}

	function Panorama(organizations) {
		this.organizations = ko.observableArray(organizations);
		this.organization = ko.observable(_.first(organizations));
		this.view = ko.observable('list');
		this.loading = ko.observable(false);
		this.error = ko.observable();
		this.pushes = ko.observableArray();
		this.filter = ko.observable();
		this.laneLabelVisible = ko.observable(false);

		this.organizationInput = ko.computed({
			read: function () {
				var org = this.organization();
				return org && org.login;
			},
			write: function (str) {
				var view = this.view();
				history.pushState(null, null, '/' + view + '?organization=' + str);
				this.organization({ login: str });
			},
			owner: this
		});

		var underlay = {};
		this.adjustAllLanes = _.debounce(function () {
			var element = document.getElementById('underlay');
			if (element !== underlay.element) {
				underlay = { element: element, svg: SVG(element) };
			}
			drawLanesSvg(underlay.svg);
		}, 100);
		this.repos = ko.computed({
			read: function() {
				var org = this.organization();
				function simpleName(name) {
					if (org && name.indexOf(org.login) === 0) {
						return name.substr(org.login.length + 1);
					}
					return name;
				}

				var index = 0;
				return _.sortBy(_.map(_.groupBy(this.pushes(), function (push) {
					return push.repo;
				}), function (pushes, repo) {
					return {
						name: repo,
						simpleName: simpleName(repo),
						pushes: pushes,
						color: colors[index++ % colors.length]
					};
				}), function (repo) {
					return repo.name;
				});
			},
			owner: this,
			deferEvaluation: true
		});
		this.filteredPushes = ko.computed({
			read: function() {
				var filter = this.filter();
				if (!filter) {
					return this.pushes();
				} else {
					return ko.utils.arrayFilter(this.pushes(), filter);
				}
			},
			owner: this,
			deferEvaluation: true
		});
		this.buckets = ko.computed({
			read: function () {
				var pushes = this.pushes();
				var bucketEnd;
				var bucketIndex = 0;
				var bucketSizeIndex = 0;
				var bucketSize = [{ minutes: 15 }, { hours: 1 }, { hours: 4 }];
				var buckets = [];

				function bucketer(date) {
					if (bucketEnd == null) {
						bucketEnd = moment(date).clone().startOf('minute');
						bucketEnd.minutes(15 * Math.floor(bucketEnd.minutes() / 15));
						bucketEnd.subtract(bucketSize[0]);
						buckets.push({ time: bucketEnd.clone(), label: bucketEnd.fromNow() });
					}
					if (bucketEnd.isBefore(date)) {
						return bucketIndex;
					}
					while (true) {
						bucketSizeIndex++;
						bucketEnd.subtract(bucketSize[Math.floor(bucketSizeIndex / 12)] || { days: 1 });
						if (bucketEnd.isBefore(date)) {
							buckets.push({ time: bucketEnd.clone(), label: bucketEnd.fromNow() });
							return ++bucketIndex;
						}
					}
				}

				_.each(pushes, function (push) {
					push.bucket = bucketer(push.date);
				});

				return buckets;
			},
			owner: this,
			deferEvaluation: true
		});
		this.bucketLabels = ko.computed({
			read: function () {
				var labels = _.pluck(this.buckets(), 'label');
				labels.unshift('now');
				labels.pop();

				var seenLabel = {};
				return _.map(labels, function (label) {
					var firstSeen = !seenLabel[label];
					seenLabel[label] = true;
					return {
						label: label,
						first: firstSeen
					};
				});
			},
			owner: this,
			deferEvaluation: true
		});
		this.bucketedPushesByRepo = ko.computed({
			read: function () {
				var buckets = this.buckets();
				var repos = this.repos();

				return _.map(repos, function (repo) {
					var result = [];
					while (result.length < buckets.length) {
						result.push({
							bucket: result.length,
							bucketClass: 'bucket-' + result.length + ' bucket-color-' + result.length % colors.length,
							pushes: []
						});
					}
					var compressed = compressPushes(repo.pushes);
					compressed.forEach(function (push) {
						if (push.bucket < result.length) {
							result[push.bucket].pushes.push(push);
						} // else buckets are stale
					});
					return {
						repo: repo,
						buckets: result
					};
				});
			},
			owner: this,
			deferEvaluation: true
		});
	}

	Panorama.prototype.switchView = function () {
		var next = { list: 'lanes', lanes: 'list' };
		this.view(next[this.view()]);
	};
	Panorama.prototype.getRepository = function (repoName) {
		var repo = _.findWhere(this.repos(), {name: repoName});
		return repo || {name: '', simpleName: '', color: 'black'};
	};
	Panorama.prototype.formatTimeAgo = function (time) {
		return moment(time).fromNow();
	};
	Panorama.prototype.getPushTime = function (push) {
		return this.formatTimeAgo(push.date);
	};
	Panorama.prototype.setFilter = function (type, value) {
		var state = '/list?organization=' + this.organization().login;
		if (type == 'repo' && value) {
			history.pushState(null, null, state + '&repo=' + value);
			this.filter(function (push) { return push.repo === value; });
		} else if (type == 'user' && value) {
			history.pushState(null, null, state + '&user=' + value);
			this.filter(function (push) { return push.user.login === value; });
		} else {
			history.pushState(null, null, state);
			this.filter(null);
		}
		this.view('list');
	};
	Panorama.prototype.applyWindowLocation = function () {
		this.view(window.location.pathname.substring(1));
		var search = parseLocationSearch();

		if (search && search.organization) {
			this.organization({ login: search.organization });
		}

		// TODO: could make these additive, but is that intuitive?
		if (search && search.user) {
			this.filter(function (push) { return push.user.login === search.user; });
		} else if (search && search.repo) {
			this.filter(function (push) { return push.repo === search.repo; });
		} else {
			this.filter();
		}
	};
	Panorama.prototype.init = function () {
		this.applyWindowLocation();
		window.onpopstate = this.applyWindowLocation.bind(this);

		var lanes = document.querySelectorAll('.inner-lane-wrapper')[0];
		window.onscroll = function () {
			//console.log('window scrolled', lanes[0].getBoundingClientRect().top);
			var showLabel = lanes && lanes.getBoundingClientRect().top <= 0;
			this.laneLabelVisible(showLabel);
		}.bind(this);

		fetchPushes(this);
		this.organization.subscribe(fetchPushes.bind(null, this));

		this.view.subscribe(function (view) {
			var pathname = '/' + view;
			if (window.location.pathname.indexOf(pathname) !== 0) {
				history.pushState(null, null, pathname + '?organization=' + this.organization().login);
			}
		}, this);

		ko.applyBindings(this);
	};

	function parseLocationSearch() {
		if (!location.search) {
			return {};
		}
		var map = {};
		var parsed = location.search.substring(1);
		var pairs = parsed.split('&');
		pairs.forEach(function (pair) {
			var split = pair.split('=');
			map[split[0]] = split[1];
		});
		return map;
	}

	function makeTooltip(options) {
		options = options || {};

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

	function PushEvent(event) {
		this.event = event;

		this.id = event.payload.push_id;
		this.repo = event.repo.name;
		this.repoUrl = event.repo.url.replace("/api/v3/repos/", "/");
		this.user = {
			login: event.actor.login,
			url: event.actor.url,
			image: safeToAppend(event.actor.avatar_url)
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
			return this.repoUrl + '/commit/' + this.head;
		}
		return this.repoUrl + '/compare/' + this.before + '...' + this.head;
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
		return makeTooltip.call(this, { branch: true });
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

	function CommentEvent(event) {
		this.event = event;

		this.id = event.payload.comment.id;
		this.repo = event.repo.name;
		this.user = {
			login: event.actor.login,
			url: event.actor.url,
			image: safeToAppend(event.actor.avatar_url)
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
		return makeTooltip.call(this, { branch: true });
	};

	CommentEvent.prototype.combine = function () {
		return false;
	};

	CommentEvent.prototype.icon = function () {
		return 'octicon-comment';
	};

	function TagEvent(event) {
		this.event = event;

		this.id = event.id;
		this.repo = event.repo.name;
		this.repoUrl = event.repo.url.replace("/api/v3/repos/", "/");
		this.user = {
			login: event.actor.login,
			url: event.actor.url,
			image: safeToAppend(event.actor.avatar_url)
		};
		this.date = event.created_at;
		this.size = 0;
		this.branch = event.payload.ref;
	}

	TagEvent.prototype.link = function () {
		return this.repoUrl + '/tree/' + this.event.payload.ref;
	};

	TagEvent.prototype.linkLabel = function () {
		return 'new tag';
	};

	TagEvent.prototype.message = function () {
		return '‣ created tag ' + this.event.payload.ref;
	};

	TagEvent.prototype.tooltip = function () {
		return makeTooltip.call(this);
	};

	TagEvent.prototype.combine = function () {
		return false;
	};

	TagEvent.prototype.icon = function () {
		return 'octicon-tag';
	};

	function BranchEvent(event) {
		this.event = event;

		this.id = event.id;
		this.repo = event.repo.name;
		this.repoUrl = event.repo.url.replace("/api/v3/repos/", "/");
		this.user = {
			login: event.actor.login,
			url: event.actor.url,
			image: safeToAppend(event.actor.avatar_url)
		};
		this.date = event.created_at;
		this.size = 0;
		this.branch = event.payload.ref;
	}

	BranchEvent.prototype.link = function () {
		return this.repoUrl + '/tree/' + this.event.payload.ref;
	};

	BranchEvent.prototype.linkLabel = function () {
		return 'new branch';
	};

	BranchEvent.prototype.message = function () {
		return '‣ created branch ' + this.event.payload.ref;
	};

	BranchEvent.prototype.tooltip = function () {
		return makeTooltip.call(this);
	};

	BranchEvent.prototype.combine = function () {
		return false;
	};

	BranchEvent.prototype.icon = function () {
		return 'octicon-git-branch';
	};

	function WikiEvent(event) {
		this.event = event;

		this.id = event.id;
		this.repo = event.repo.name;
		this.user = {
			login: event.actor.login,
			url: event.actor.url,
			image: safeToAppend(event.actor.avatar_url)
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
		return makeTooltip.call(this);
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

	function fetchPushes(viewModel) {
		viewModel.pushes([]);
		viewModel.error(null);
		viewModel.loading(true);

		var org = viewModel.organization();
		var url = (org == null || org === '') ? './a/user/events' : './a/organization/' + org.login + '/events';

		reqwest({
			url: url,
			type: 'json'
		}).then(function (response) {
			var seen = {};

			var pushes = [];
			_.each(response, function (event) {
				if (!seen[event.type]) {
					seen[event.type] = true;
				}
				if (event.type === 'PushEvent') {
					pushes.push(new PushEvent(event));
				} else if (event.type === 'CommitCommentEvent') {
					pushes.push(new CommentEvent(event));
				} else if (event.type === 'CreateEvent') {
					if (event.payload.ref_type === 'tag') {
						// at least for us, tags are very spammy
						// pushes.push(new TagEvent(event));
					} else if (event.payload.ref_type === 'branch') {
						pushes.push(new BranchEvent(event));
					} else {
						console.log(event);
					}
				} else if (event.type === 'GollumEvent') {
					pushes.push(new WikiEvent(event));
				}
			});
			viewModel.pushes(pushes);
			viewModel.loading(false);
		}).fail(function (err) {
			console.error(err);
			viewModel.loading(false);
			viewModel.error("couldn't fetch fetch activity for " + org.login);
		});
	}

	function compressPushes(pushes) {
		var compressed = [];
		_.each(pushes, function (push) {
			var last = _.last(compressed);
			var together = last && last.combine(push);
			if (together) {
				compressed.pop();
				compressed.push(together);
			} else {
				compressed.push(push);
			}
		});
		return compressed;
	}

	return Panorama;

}());
