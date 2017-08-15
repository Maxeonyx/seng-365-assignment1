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

    if (!data.user || !data.password) {
        return res.status(400).send("Must include username, email and password.");
    }
    if (validate(validate.schema.password, data.password).error) {
        return res.status(400).send("Malformed password.");
	}
	if (validate(validate.schema.user, data.user).error) {
        console.log(validate(validate.schema.user, data.user).error);
        return res.status(400).send("Malformed details, check username and email are valid.");
    }

	db.queries.createUser(data.user, data.password)
	.then((userId) => {
		res.status(201).send({id: userId});
	}).catch((err) => {
		console.log(err);
		res.status(500).send("Internal Server Error");
	});

});

router.post('/login', (req, res, next) => {
	const data = req.body;

	if (!data.username || !data.password)
		return res.status(400).send("Must include username and password");

	if (validate(validate.schema.user.username, data.username).error)
		return res.status(400).send("Malformed username");

    if (validate(validate.schema.password, data.password).error)
        return res.status(400).send("Malformed password");

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