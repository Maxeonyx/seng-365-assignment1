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
		.then((result) => result.rows[0]['last_insert_id()'])
		.then((user_id) => {
			return query(
				'INSERT INTO password (user_id, password) VALUES ?',
				[[[user_id, password]]]
			)
			.then(() => user_id);
		})
		.then(commit)
		.catch(rollback);
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
			return result
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
	},
	createProject (project) {
		return begin()
			.then(() => query(
				`INSERT INTO project (
					title,
					subtitle,
					description,
					imageUri,
					target
				) VALUES ?`,
				[[[
					project.title,
					project.subtitle,
					project.description,
					project.imageUri,
					project.target
				]]]
			))
			.then(() => query('SELECT last_insert_id()'))
			.then((result) => result.rows[0]['last_insert_id()'])
			.then((project_id) => {
				return query(
					`INSERT INTO creator (project_id, user_id, name) VALUES ?`,
					project.creators.map((creator) => {
						return [project_id, creator.user_id, creator.name];
					})
				})
				.then(() => project_id);
			})
			.then((project_id) => {
				return query(
					`INSERT INTO reward (project_id, amount, description) VALUES ?`,
					project.rewards.map((reward) => {
						return [project_id, reward.amount, reward.description];
					})
				})
				.then(() => project_id);
			})
			.then(commit)
			.catch(rollback);
	}
};


module.exports = {
	connect: connect,
	initialise: initialise,
	queryFile: queryFile,
	query: query,
	queries: queries
};