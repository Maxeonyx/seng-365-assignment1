'use strict';

const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db.js');

const app = express();

app.use(bodyParser.json());

app.use('/', require('./routes/base.js'));
app.use('/users', require('./routes/users.js'));
app.use('/projects', require('./routes/projects.js'));

db.initialise().then(() => {
	
	app.set('port', process.env.PORT || 8080);

	app.listen(app.get('port'), () => {
		console.log("Listening on port: " + app.get('port'));
	});

})
.catch((err) => {
	console.log(err);
	console.log("Failed to start server.")
});