const mysql = require('mysql');
const joi = require('joi');

const schemas = {
	user: {
		id: joi.number().integer(),
		username: joi.string().regex(/^[a-zA-Z0-9_]{3,30}$/).required(),
		location: joi.string(),
		email: joi.string().email()
	}
};

module.exports = {

	user: (obj) => {
		return joi.validate(obj, schemas.user);
	}
};