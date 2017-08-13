'use strict';

const express = require('express');
const bodyParser = require('body-parser');


const app = express();

app.use(bodyParser.json())

app.use('/users', require('./routes/users.js'));

app.set('port', process.env.PORT || 8080);

app.post('/echo', (req, res, next) => {

	let jobj = req.body;

	res.send(jobj);

});


app.listen(app.get('port'), () => {



  console.log("Listening on port: " + app.get('port'));

});