var port = process.env.PORT || 3000;
var app = require('./app');

app.listen(port, function() {
	console.log(new Date() + ": listening on " + port);
});
module.exports = app;
