var port = process.env.PORT || 3456;
require('./app').listen(port, function() {
	console.log(new Date() + ": listening on " + port);
});
