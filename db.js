"use strict";

const mysql = require('mysql');
const fs = require('fs');

let connection = null;

const connect = (database) => {
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
		//if (connection === null) return reject(new Error("DB not connected."));

		fs.readFile('sql_ddl/' + file, 'utf8', (err, file_contents) => {
			if (err) return reject(new Error("Could not read file"));
            console.log("Running query " + file);
			connection.query(file_contents, (err, result) => {
				if (err) return reject(new Error("SQL Error"));
				return resolve(result);
			});
		});
	});
};


const initialise = () => {

	return connect('mysql')
		.then(() => query('database.sql'))
		.then(() => connect('mgc70'))
        .then(() => query('tables/user.sql'))
		.then(() => query('tables/password.sql'))
		.then(() => console.log("DB Initialised!"));

};



module.exports = {
	connect: connect,
	initialise: initialise,
	query: query
};