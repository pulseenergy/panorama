var Panorama = (function () {
	"use strict";

	var colors = [
		"#807c59",
		"#618059",
		"#73bf60",
		"#ccae8f",
		"#806c59",
		"#bf9060",
		"#65567a",
		"#8860bf",
		"#bfb660",
		"#cc8f8f",
		"#bf6060"
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

	function bump(node, property, amount) {
		var previous = parseInt(window.getComputedStyle(node)[property], 10) || 0;
		node.style[property] = previous + amount + "px";
	}

	function sum(arr) {
		return arr.reduce(function (a, b) {
			return a + b;
		});
	}

	function drawLanesSvg(underlay) {
		var overlap = 0;

		underlay.clear();

		var rows = [];
		for (var bucket = 0; ; bucket++) {
			var row = document.querySelectorAll('.pushes.bucket-' + bucket);
			if (!row.length) break;

			rows.push(row);
		}

		var adjusts = 0;
		rows.forEach(function (row, bucket) {
			// TODO do all the math in memory, then dump it into the DOM when finished
			for (var c = 0; c < row.length; c++) {
				if (adjusts++ > 5000) {
					console.log('too many layout iterations, aborting');
					return;
				}

				var current = row[c];
				var previous = row[c - 1];

				if (previous) {
					var pt = previous.offsetTop;
					var pb = pt + previous.offsetHeight;

					var ct = current.offsetTop;
					var cb = ct + current.offsetHeight;

					if (ct > (pb - overlap)) {
						// bump previous, recursively
						bump(previous, 'marginTop', ct - pb + overlap);
						c -= 2;
					} else if (cb < (pt + overlap)) {
						// bump current, no recursion
						bump(current, 'marginTop', pt - cb + overlap);
					}
				}
			}
		});

		// create filled regions
		if (false) {
			rows.reduceRight(function (nextRow, row, bucket) {
				for (var c = 0; c < row.length; c++) {
					if (nextRow) {
						var availableBelow = parseInt(nextRow[c].style.marginTop, 10) || 0;
						if (availableBelow > 0) {
							nextRow[c].style.marginTop = 0;
							bump(row[c], 'paddingBottom', availableBelow);
						}
					}
				}
				return row;
			}, null);
		}

		// try to flatten lines
		if (false) {
			adjusts = 0;
			rows.reduceRight(function (nextRow, row, bucket) {
				for (var c = 0; c < row.length; c++) {
					if (adjusts++ > 500) {
						console.log('too many optimisation iterations, aborting');
						return;
					}

					var current = row[c];
					var previous = row[c - 1];
					var next = row[c + 1];

					// is there space to steal from below
					var availableAbove = parseInt(current.style.marginTop, 10) || 0;
					var availableBelow = nextRow ? parseInt(nextRow[c].style.marginTop, 10) || 0 : Infinity;

					var ct = current.offsetTop;
					var cb = ct + current.offsetHeight;
					var cm = ct + current.offsetHeight / 2;

					var d = [];

					// constrained by left
					var lf = Infinity;
					if (previous) {
						var pt = previous.offsetTop;
						var pb = pt + previous.offsetHeight;
						var pm = pt + previous.offsetHeight / 2;
						lf = Math.max(0, (pb - overlap) - ct);
						d.push(pm - cm);
					}

					// constrained by right
					var rf = Infinity;
					if (next) {
						var nt = next.offsetTop;
						var nb = nt + next.offsetHeight;
						var nm = nt + next.offsetHeight / 2;
						rf = Math.max(0, (nb - overlap) - ct);
						d.push(nm - cm);
					}

					var ed = sum(d) / d.length;
					ed = Math.max(Math.floor(ed), 0);
					var amt = Math.min(lf, rf, availableBelow, ed);
//					console.log('::', current, lf, rf, availableBelow, d, ed, '=', amt);
					if (amt > 5) {
						bump(current, 'marginTop', amt);
						if (nextRow) {
							bump(nextRow[c], 'marginTop', -amt);
						}
						if (previous) {
							c -= 2;
						}
					}
				}
				return row;
			}, null);
		}

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
					// FIXME magic number: 5 for overlap = 0; 7.5 with overlap = -5
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

		rows.forEach(function (row, bucket) {
			underlay.path(smooth(points(row, -1), 'ymin', null, false))
				.fill('none').stroke({width: "2px", color: colors[bucket % colors.length]});
		});
	}

	function Panorama(organizations) {
		this.organizations = ko.observableArray(organizations);
		this.organization = ko.observable(_.first(organizations));
		this.view = ko.observable('list');
		this.loading = ko.observable(false);
		this.repos = ko.observableArray();
		this.pushes = ko.observableArray();
		this.startDate = ko.observable();
		this.endDate = ko.observable();
		this.filter = ko.observable();
		this.adjustAllLanes = _.debounce(function () {
			drawLanesSvg(this.underlay);
		}.bind(this), 100);
		this.startFormatted = ko.computed(function () {
			return moment(this.startDate()).fromNow();
		}, this);
		this.endFormatted = ko.computed(function () {
			return moment(this.endDate()).fromNow();
		}, this);
		this.filteredPushes = ko.computed(function() {
			var filter = this.filter();
			if (!filter) {
				return this.pushes();
			} else {
				return ko.utils.arrayFilter(this.pushes(), filter);
			}
		}, this);
	}

	Panorama.prototype.getGithubCompareLink = function (push) {
		return 'https://github.com/' + [push.repo.name, 'compare', push.before + '...' + push.head].join('/');
	};
	Panorama.prototype.getPushCommits = function (push) {
		var messages = _.map(_.pluck(push.commits, 'message'), function (msg) {
			return '‣ ' + msg;
		});
		return messages.join('\n');
	};
	Panorama.prototype.getPushTime = function (push) {
		return moment(push.date).fromNow();
	};
	Panorama.prototype.getPushTooltip = function (push) {
		return this.getPushTime(push) + '\n' + this.getPushCommits(push);
	};
	Panorama.prototype.getSimpleRepoName = function (name) {
		var organization = this.organization();
		if (organization && name && name.indexOf(organization.login + '/') === 0) {
			return name.substr(organization.login.length + 1);
		}
		return name;
	};
	Panorama.prototype.setFilter = function (data, event) {
		if (event.target.className === 'repo-tag') {
			this.filter(function (push) { return push.repo.name === data.repo.name; });
		} else if (event.target.className === 'push-user') {
			this.filter(function (push) { return push.user.login === data.user.login; });
		} else {
			this.filter(null);
		}
	};
	Panorama.prototype.bucketize = function (pushes) {
		var max = _.last(this.pushes());
		max = max ? max.bucket : 0;

		var result = [];
		while (result.length <= max) {
			result.push({
				bucket: result.length,
				bucketClass: 'bucket-' + result.length + ' bucket-color-' + result.length % colors.length,
				pushes: []
			});
		}

		pushes.forEach(function (push) {
			result[push.bucket].pushes.push(push);
		});
		return result;
	};
	Panorama.prototype.init = function () {
		var underlay = document.getElementById('underlay');
		if (underlay) {
			this.underlay = SVG(underlay);
		}

		this.view(window.location.href.replace(/.*\/([^/]+)$/, "$1"));
		fetchPushes(this);
		this.organization.subscribe(fetchPushes.bind(null, this));
		this.view.subscribe(function (view) {
			window.location = './' + view;
		});
		ko.applyBindings(this);
	};

	function fetchPushes(viewModel) {
		viewModel.loading(true);

		var org = viewModel.organization();
		var url = org == null ? './a/user/pushes' : './a/organization/' + org.login + '/pushes';

		function simpleName(name) {
			if (org && name.indexOf(org.login) === 0) {
				return name.substr(org.login.length + 1);
			}
			return name;
		}

		var bucketEnd;
		var bucketIndex = 0;
		var bucketSizeIndex = 0;
		var bucketSize = [{ minutes: 15 }, { hours: 1 }, { hours: 4 }];
		function bucketer(date) {
			if (bucketEnd == null) {
				bucketEnd = moment(date).clone().startOf('minute');
				bucketEnd.minutes(15 * Math.floor(bucketEnd.minutes() / 15));
				bucketEnd.subtract(bucketSize[0]);
			}
			if (bucketEnd.isBefore(date)) {
				return bucketIndex;
			}
			while (true) {
				bucketSizeIndex++;
				bucketEnd.subtract(bucketSize[Math.floor(bucketSizeIndex / 12)] || { days: 1 });
				if (bucketEnd.isBefore(date)) {
					return ++bucketIndex;
				}
			}
		}

		reqwest({
			url: url,
			type: 'json'
		}).then(function (response) {

			var pushes = response.pushes;
			_.each(pushes, function (push) {
				push.bucket = bucketer(push.date);
			});

			var index = 0;
			var repos = _.sortBy(_.map(_.groupBy(pushes, function (push) {
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
			_.each(repos, function (repo) {
				_.each(repo.pushes, function (push) {
					push.repo = repo;
				});
			});
			viewModel.startDate(response.start);
			viewModel.endDate(response.end);
			viewModel.pushes(pushes);
			viewModel.repos(repos);
			viewModel.loading(false);
		}).fail(function (err, msg) {
			console.error(msg);
		});
	}

	return Panorama;

}());