"use strict";

const mysql = require('mysql');
const fs = require('fs');
const crypto = require('crypto');

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

/// For queries with no variables, stored in files E.G. DDL or some reports
const queryFile = (file) => {
	return new Promise((resolve, reject) => {
		if (connection === null) return reject(new Error("DB not connected."));

		fs.readFile('sql_ddl/' + file, 'utf8', (err, file_contents) => {
			if (err) return reject(new Error("Could not read file"));
			console.log("Running query " + file);
			resolve(file_contents);
		});
	}).then((file_contents) => query(file_contents));
};

const query = (text, values) => {
	return new Promise((resolve, reject) => {
		if (connection === null) return reject(new Error("DB not connected."));

		connection.query(text, values, (err, rows, fields) => {
			if (err) return reject(new Error("SQL Error: " + err.message + err.stack));
			return resolve({rows:rows, fields:fields});
		});
	});
};

const initialise = () => {

	return connect('mysql')
		.then(() => queryFile('database.sql'))
		.then(() => connect('mgc70'))
		.then(() => queryFile('tables/user.sql'))
		.then(() => queryFile('tables/password.sql'))
		.then(() => queryFile('tables/session.sql'))
		.then(() => console.log("DB Initialised!"));

};

const begin = () => {
	return new Promise((resolve, reject) => {
		connection.beginTransaction((err) => {
			if (err) return reject(new Error("SQL Error: " + err.message));
			resolve();
		});
	});
};
const commit = (param) => {
	return new Promise((resolve, reject) => {
		connection.commit((err) => {
			if (err) {
				reject(new Error("Rolled back SQL Error: " + err.message));
			} else {
				resolve(param);
			}
		});
	});
};
const rollback = (err) => {
	console.log("Rolled Back");
	connection.rollback();
	throw err;
};

const queries = {
	createUser (user, password) {
		return begin()
		.then(() => query(
			'INSERT INTO user (username, location, email) VALUES ?',
			[[[user.username, user.location, user.email]]]
		))
		.then(() => query('SELECT last_insert_id()'))
		.then((result) => {
			let last_id = result.rows[0]['last_insert_id()'];
			return query(
				'INSERT INTO password (user_id, password) VALUES ?',
				[[[last_id, password]]]
			)
			.then(() => last_id);
		})
		.then(commit)
		.catch(rollback);
	},
	getUser (userId) {
		return query(
			`SELECT
				user_id, username, email, location
			FROM user
			WHERE user_id = ?`,
			[userId]
		).then((result) => {
			if (result.rows.length === 1) {
				let record = result.rows[0];
				return { 
					user_id: record.user_id,
					username: record.username,
					email: record.email,
					location: record.location
				};
			} else {
				return null;
			}
		});
	},
	updateUserAndPassword (userId, user, password) {
		return query(
			`UPDATE user u
			INNER JOIN password p ON u.user_id = p.user_id
			SET 
				u.username = COALESCE(?, u.username),
				u.email = COALESCE(?, u.email),
				u.location = COALESCE(?, u.location),
				p.password = COALESCE(?, p.password)
			WHERE u.user_id = ?`,
			[user.username, user.email, user.location, password, userId]
		).then((result) => {
			let affect = result.rows.affectedRows;
			return affect > 0 && affect <= 2;
		});
	},
	deleteUser (userId) {
		return query(
			`DELETE FROM user WHERE user_id = ?`,
			[userId]
		).then((result) => result.rows.affectedRows == 1);
	},
	createSession (userId) {
		let token = crypto.randomBytes(69).toString('hex');
		return query(
			`INSERT INTO session (user_id, token) VALUES ?
			ON DUPLICATE KEY UPDATE
				token = ?,
				create_time = now();`,
			[[[userId, token]], token]
		)
		.then(() => ({userId: userId, token: token}));
	},
	login (username, password) {
		return begin()
			.then(() => query(
				`SELECT u.user_id FROM user u
				INNER JOIN password p ON p.user_id = u.user_id
				WHERE u.username = ?
					AND p.password = ?;`,
				[username, password]
			))
			.then((result) => {
				if (result.rows.length === 1) {
					let userId = result.rows[0].user_id;
					return this.createSession(userId)
						.then((result) => {
							result.success = true;
							return result;
						});
				} else {
					return {success: false};
				}
			})
			.then(commit)
			.catch(rollback);
	},
	authenticate (token) {
		return query(
			`SELECT user_id FROM session WHERE token = ?`,
			[token]
		).then((result) => {
			let {rows, fields} = result;
			if (rows.length === 1) {
				result.success = true;
				result.userId = rows[0].user_id;
			} else {
				result.success = false;
			}
			return result;
		});
	},
	logout (token) {
		return query(
			`DELETE FROM session WHERE token = ?`,
			[token]
		).then((result) => {
			if (result.rows.affectedRows === 1) {
				result.success = true;
			} else {
				result.success = false;
			}
			return result;
		});
	}
};


module.exports = {
	connect: connect,
	initialise: initialise,
	queryFile: queryFile,
	query: query,
	queries: queries
};