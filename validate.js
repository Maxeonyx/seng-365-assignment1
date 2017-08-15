const mysql = require('mysql');
const joi = require('joi');

const schema = {
	user: {
		id: joi.number().integer(),
		username: joi.string().regex(/^[-a-zA-Z0-9_]{3,200}$/).required(),
		location: joi.string().allow(null),
		email: joi.string().email().required()
	},
	password: joi.string().min(6),
	token: joi.string().regex(/^[0-9a-fA-F]{138}$/)
};

module.exports = (schema, obj) => {
		return joi.validate(obj, schema);
};

module.exports.schema = schema;