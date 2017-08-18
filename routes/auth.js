const db = require('../db.js');
const validate = require('../validate.js');

const auth = function (req, res, next) {

	const token = req.get('X-Authorization');

	if (validate(validate.schema.token, token).error)
		return res.status(400).send("Malformed Authorization Token");

	db.queries.authenticate(token)
		.then((result) => {
			if (!result.success) {
				return res.status(401).send("Unauthorized");
			}
			req.auth = {
				id: result.userId
			};
			return next();
		}).catch((err) => {
			console.log(err);
			return res.status(500).send("Internal Server Error");
		});

};