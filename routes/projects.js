const router = require('express').Router();
const validate = require('../validate.js');
const db = require('../db.js');
const auth = require('./auth.js');


router.post('/', auth, (req, res, next) => {

	const data = req.body;

	if (validate(validate.schema.createProject, data).error) {
		console.log(validate(validate.schema.createProject, data).error);
		return res.status(400).send("Malformed details, check all fields are valid");
	}

	if (data.creators[0].id !== req.auth.id) {
		console.log(data);
		console.log(req.auth.id);
		return res.status(403).send("Forbidden, first creator must be the authorized user.");
	}

	db.queries.createProject(data)
	.then((projectId) => {
		res.status(201).send({id: projectId});
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});
});


module.exports = router;