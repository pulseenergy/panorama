var port = process.env.PORT || 3000;
var app = require('./app');

app.listen(port, function() {
	console.log("Listening on " + port);
});
module.exports = app;
