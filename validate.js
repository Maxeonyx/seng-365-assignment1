const mysql = require('mysql');
const joi = require('joi');



const sc = {
	user: {
		id: joi.number().integer(),
		username: joi.string().regex(/^[-a-zA-Z0-9_]{3,200}$/),
		email: joi.string().email(),
		location: joi.string().allow(null)
	},
	password: joi.string().min(6),
	token: joi.string().regex(/^[0-9a-fA-F]{138}$/)
};

module.exports = (schema, obj) => {
		return joi.validate(obj, schema);
};

module.exports.schema = {
	id: sc.user.id,
	token: sc.token,
	createUser: {
		user: {
			username: sc.user.username.required(),
			email: sc.user.email.required(),
			location: sc.user.location
		},
		password: sc.password.required()
	},
	updateUser: {
		user: sc.user,
		password: sc.password
	},
	login: {
		username: sc.user.username,
		password: sc.password
	}
};