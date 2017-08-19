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

router.get('/', (req, res, next) => {

	const data = req.query;

	if (validate(validate.schema.getProject, data).error) {
		return res.status(400).send("Invalid query params");
	}
	let startIndex = parseInt(data.startIndex);
	let count = parseInt(data.count);

	db.queries.getProjects(startIndex, count)
	.then((projects) => {
		res.status(201).send(projects);
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});
});

router.get('/:id', (req, res, next) => {

	let projectId = req.params.id;

	if (validate(validate.schema.id, projectId).error) {
		return res.status(400).send("Invalid project id");
	}
	
	projectId = parseInt(projectId);

	db.queries.getProject(projectId)
	.then((project) => {
		res.status(201).send(project);
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});
});

router.post('/:id/pledge', auth, (req, res, next) => {

	const data = req.body;

	if (validate(validate.schema.createPledge, data).error) {
		return res.status(400).send("Malformed details, check all fields are valid");
	}

	let projectId = req.params.id;
	if (validate(validate.schema.id, projectId).error) {
		return res.status(400).send("Invalid project id");
	}
	projectId = parseInt(projectId);

	let backer = {
		userId: req.auth.id,
		pledge: data.amount,
		anonymous: data.anonymous || false
	};

	db.queries.createBacker(projectId, backer)
	.then((backerId) => {
		res.status(201).send("OK");
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});
});

router.get('/:id/rewards', (req, res, next) => {

	let projectId = req.params.id;

	if (validate(validate.schema.id, projectId).error) {
		return res.status(400).send("Invalid project id");
	}
	projectId = parseInt(projectId);

	db.queries.getRewards(projectId)
	.then((rewards) => {
		res.status(201).send(rewards);
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});
});


module.exports = router;