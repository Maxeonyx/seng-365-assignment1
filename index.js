'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');

const db = require('./db.js');

const app = express();

app.use(bodyParser.json());

app.use('/', require('./routes/base.js'));
app.use('/users', require('./routes/users.js'));
app.use('/projects', require('./routes/projects.js'));

db.initialise().then(() => {

	app.set('port', process.env.SENG365_PORT || 4850);

	app.listen(app.get('port'), () => {
		console.log("Listening on port: " + app.get('port'));
	});

})
.catch((err) => {
	request({
		url: 'https://api.paste.ee/v1/pastes',
		method: 'POST',
		json: {
			"sections": [
				{
					"name": "Express log " + Date(),
					"contents": err.toString() + '\n' + JSON.stringify(process.env, null, 4)
				}
			]
		},
		headers: {
			"X-Auth-Token": "u6L4fYvAXpEGWma7kflDHbB64IVjuRjTkvRJj7mfd"
		}
	}, function (err, response, body) {
		console.log(err);
		console.log(body);
	});
	console.log(err);
	console.log("Failed to start server.")
});