const _ = require('underscore');
const SVG = require('SVG');
const colors = require('./colors');

function drawLanes(underlay) {
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
	shadow.forEach(function (row) {
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

function sign(n) {
	if (isNaN(n)) {
		return n;
	}
	if (n === 0) {
		return n;
	}
	return n > 0 ? 1 : -1;
}

exports.drawLanes = drawLanes;
exports.make = SVG;
