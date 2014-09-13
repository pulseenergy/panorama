var port = process.env.PORT || 3456;
if (process.env.REPLAY) {
	require('replay');
}
require('./app').listen(port, function() {
	console.log(new Date() + ": listening on " + port);
});
