const router = require('express').Router();
const validate = require('../validate.js')

router.post('/echo', (req, res, next) => {

	let post_data = req.body;
	res.send(post_data);

});

module.exports = router;