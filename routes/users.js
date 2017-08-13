const router = require('express').Router();
const validate = require('../validator.js');

router.get('/', (req, res, next) => {

	let jobj = req.body;

	res.send(jobj);

});

router.post('/user', (req, res, next) => {
	let post_data = req.body;

	let {err, user} = validate.user(post_data);

	if (err) {
		return res.send(400, "Malformed user data");
	}

	res.send(200, "Created User");

});



module.exports = router;