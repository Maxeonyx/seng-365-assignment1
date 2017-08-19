const router = require('express').Router();
const validate = require('../validate.js');
const db = require('../db.js');
const auth = require('./auth.js');

router.get('/', (req, res, next) => {

	let jobj = req.body;

	res.send(jobj);

});

router.post('/', (req, res, next) => {
	const data = req.body;

	if (validate(validate.schema.createUser, data).error) {
		console.log(validate(validate.schema.createUser, data).error);
		return res.status(400).send("Malformed details, check username, password and email exist, and are valid.");
	}

	db.queries.createUser(data.user, data.password)
	.then((userId) => {
		res.status(201).send({id: userId});
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.get('/:id', (req, res, next) => {

	let id = req.params.id;

	if (validate(validate.schema.id, id).error) {
		return res.status(400).send("Malformed user id.");
	}

	db.queries.getUser(id)
	.then((user) => {
		if (user === null) {
			return res.status(404).send("User not found.");
		}
		return res.status(200).send(user);
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.put('/:id', auth, (req, res, next) => {

	let id = req.params.id;

	if (validate(validate.schema.id, id).error) {
		return res.status(400).send("Malformed user id.");
	}

	id = parseInt(id);

	if (id !== req.auth.id) {
		return res.status(403).send("Forbidden, account not owned");
	}

	let data = req.body;

	if (validate(validate.schema.updateUser, data).error) {
		return res.status(400).send("Malformed details.");
	}

	db.queries.updateUserAndPassword(id, data.user, data.password)
	.then((success) => {
		if (success === false) {
			return res.status(404).send("User not found.");
		}
		return res.status(200).send("OK");
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.delete('/:id', auth, (req, res, next) => {

	let id = req.params.id;

	if (validate(validate.schema.id, id).error) {
		return res.status(400).send("Malformed user id.");
	}

	id = parseInt(id);

	if (id !== req.auth.id) {
		return res.status(403).send("Forbidden, account not owned");
	}

	db.queries.deleteUser(id)
	.then((success) => {
		if (success === false) {
			return res.status(404).send("User not found.");
		}
		return res.status(200).send("OK");
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.post('/login', (req, res, next) => {
	const data = req.body;

	if (!data.username || !data.password)
		return res.status(400).send("Must include username and password");

	if (validate(validate.schema.login, data).error)
		return res.status(400).send("Malformed username or password");

	db.queries.login(data.username, data.password)
	.then((result) => {
		let {success, userId, token} = result;
		if (success) {
			res.status(200).send({id: userId, token: token});
		} else {
			res.status(400).send("Invalid username or password");
		}
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.post('/logout', auth, (req, res, next) => {
	let token = req.get('X-Authorization');
	db.queries.logout(token)
	.then((result) => {
		let {success} = result;
		if (success) {
			res.status(200).send("OK");
		} else {
			res.status(400).send("Logout Unsuccessful");
		}
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});


module.exports = router;