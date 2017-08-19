"use strict";

const mysql = require('mysql');
const fs = require('fs');
const crypto = require('crypto');

let connection = null;

const connect = (database) => {
	return new Promise((resolve, reject) => {
		connection = mysql.createConnection({
			port: process.env.SENG365_MYSQL_PORT || 3306,
			host: process.env.SENG365_MYSQL_HOST || "mysql",
			user: "root",
			password: "secret",
			database: database,
			debug: true
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
		.then(() => queryFile('tables/project.sql'))
		.then(() => queryFile('tables/creator.sql'))
		.then(() => queryFile('tables/backer.sql'))
		.then(() => queryFile('tables/reward.sql'))
		.then(() => queryFile('tables/image.sql'))
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
	getUser (userId) {
		return query(
			`SELECT
				user_id, username, email, location
			FROM user
			WHERE user_id = ?`,
			[userId]
		).then((result) => {
			if (result.rows.length === 1) {
				let row = result.rows[0];
				return { 
					id: row.user_id,
					username: row.username,
					email: row.email,
					location: row.location
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
	},
	createBacker (projectId, backer) {
		return query(
			`INSERT INTO backer (
				project_id,
				user_id,
				pledge,
				anonymous
			) VALUES ?`,
			[[[
				projectId,
				backer.userId,
				backer.pledge,
				backer.anonymous
			]]]
		)
		.then(() => query('SELECT last_insert_id()'))
		.then((result) => result.rows[0]['last_insert_id()']);
	},
	getBackers (projectId) {
		return query(
			`SELECT
				backer_id,
				project_id,
				user_id,
				pledge,
				anonymous
			FROM backer
			WHERE project_id = ?
			ORDER BY backer_id`,
			[projectId]
		).then((result) => result.rows.map((row) => ({
			id: row.backer_id,
			projectId: row.project_id,
			userId: row.user_id,
			pledge: row.pledge,
			anonymous: row.anonymous
		})));
	},
	createCreator (projectId, creator) {
		return query(
			`INSERT INTO creator (
				project_id,
				user_id,
				name
			) VALUES ?`,
			[[[
				projectId,
				creator.userId,
				creator.name
			]]]
		)
		.then(() => query('SELECT last_insert_id()'))
		.then((result) => result.rows[0]['last_insert_id()']);
	},
	getCreators (projectId) {
		return query(
			`SELECT
				creator_id,
				project_id,
				user_id,
				name
			FROM creator
			WHERE project_id = ?
			ORDER BY creator_id`,
			[projectId]
		).then((result) => result.rows.map((row) => ({
			id: row.creator_id,
			projectId: row.project_id,
			userId: row.user_id,
			name: row.name
		})));
	},
	createReward (projectId, reward) {
		return query(
			`INSERT INTO reward (
				project_id,
				amount,
				description
			) VALUES ?`,
			[[[
				projectId,
				reward.amount,
				reward.description
			]]]
		)
		.then(() => query('SELECT last_insert_id()'))
		.then((result) => result.rows[0]['last_insert_id()']);
	},
	getRewards (projectId) {
		return query(
			`SELECT
				reward_id,
				project_id,
				amount,
				description
			FROM reward
			WHERE project_id = ?
			ORDER BY reward_id`,
			[projectId]
		).then((result) => result.rows.map((row) => ({
			id: row.reward_id,
			projectId: row.project_id,
			amount: row.amount,
			description: row.description
		})));
	},
	updateRewards (projectId, rewards) {
		return begin()
			.then(() => query(
				`DELETE FROM reward
				WHERE project_id = ?`,
				[projectId]
			)).then(() => query(
				`INSERT INTO reward (
					project_id,
					amount,
					description
				) VALUES ?`,
				[rewards.map((reward) => [
					projectId,
					reward.amount,
					reward.description
				])]
			))
			.then(commit)
			.catch(rollback);
	},
	createProject (project) {
		return begin()
			.then(() => query(
				`INSERT INTO project (
					title,
					subtitle,
					description,
					image_uri,
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
					[project.creators.map((creator) => [
						project_id,
						creator.id,
						creator.name
					])]
				).then(() => project_id);
			})
			.then((project_id) => {
				return query(
					`INSERT INTO reward (project_id, amount, description) VALUES ?`,
					[project.rewards.map((reward) => [
						project_id,
						reward.amount,
						reward.description
					])]
				).then(() => project_id);
			})
			.then(commit)
			.catch(rollback);
	},
	getProject (projectId) {
		return query(
			`SELECT
				p.project_id,
				title,
				subtitle,
				description,
				image_uri,
				target,
				creation_date
			FROM project p
			WHERE project_id = ?`,
			[projectId]
		).then((result) => {
			if (result.rows.length === 1) {
				let row = result.rows[0];
				return { 
					id: row.project_id,
					creationDate: row.creation_date,
					data: {
						title: row.title,
						subtitle: row.subtitle,
						description: row.description,
						imageUri: row.image_uri,
						target: row.target,
						creators: null,
						rewards: null
					},
					progress: {
						target: row.target,
						currentPledged: null,
						numberOfBackers: null
					}
				};
			} else {
				return null;
			}
		}).then((project) => {
			if (project === null) return null;
			return this.getCreators(projectId)
				.then((creators) => {
					project.data.creators = creators;
					return project;
				});
		}).then((project) => {
			if (project === null) return null;
			return this.getRewards(projectId)
				.then((rewards) => {
					project.data.rewards = rewards;
					return project;
				});
		}).then((project) => {
			if (project === null) return null;
			return this.getBackers(projectId)
				.then((backers) => {
					project.backers = backers;
					project.progress.currentPledged = backers.reduce((a, b) => {
						return a.pledge + b.pledge;
					}, 0);
					project.progress.numberOfBackers = backers.length;
					return project;
				});
		});
	},
	getProjects (startIndex, count) {
		return query(
			`SELECT
				project_id,
				title,
				subtitle,
				image_uri
			FROM project
			ORDER BY project_id
			LIMIT ? OFFSET ?`,
			[count, startIndex]
		).then((result) => {
			return result.rows.map((row) => ({ 
				id: row.project_id,
				title: row.title,
				subtitle: row.subtitle,
				imageUri: row.image_uri
			}));
		});
	},
	createImage (projectId, file) {
		return query(
			`INSERT INTO image (
				project_id,
				data,
				mimetype
			) VALUES ?
			ON DUPLICATE KEY UPDATE
				data = ?,
				mimetype = ?`,
			[[[
				projectId,
				file.buffer,
				file.mimetype
			]], file.buffer, file.mimetype]
		).then((result) => {
			if (result.rows.affectedRows === 1) {
				return true;
			} else {
				return null;
			}
		});
	},
	getImage (projectId) {
		return query(
			`SELECT 
				data,
				mimetype
			FROM image
			WHERE project_id = ?`,
			[projectId]
		).then((result) => {
				console.log(result);
			if (result.rows.length === 1) {
				return {
					buffer: result.rows[0].data,
					mimetype: result.rows[0].mimetype
				};
			} else {
				return null;
			}
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