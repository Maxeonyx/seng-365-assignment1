const mysql = require('mysql');
const fs = require('fs');

let connection = null;

const connect = (database, callback) => {
	return new Promise((resolve, reject) => {

		connection = mysql.createConnection({
			port: process.env.SENG365_MYSQL_PORT || 6033,
			host: process.env.SENG365_MYSQL_PORT || "localhost",
			user: "root",
			password: "secret",
			database: database
		});

		resolve();
	});
};


const query = (file) => {
	return new Promise((resolve, reject) => {
		if (connection === null) return reject("Not connected.");

		fs.readFile('sql_ddl/' + file, 'utf8', (err, file_contents) => {
			if (err) return reject(err);
			connection.query(file_contents, (err, result) => {
				if (err) return reject(err);
				resolve(result);
			});
		});
	});
};


const initialise = () => {

	return connect('mysql')
	.then(query('database.sql'))
	.then(connect('mgc70'))
	.then(query('tables/user.sql'))
	.then(query('tables/password.sql'))
	.then(() => console.log("DB Initialised."));

};



module.exports = {
	connect: connect,
	initialise: initialise,
	query: query
};