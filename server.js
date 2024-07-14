
require('dotenv').config();

const express = require('express');
const serverless = require("serverless-http");
const app = express();
app.disable('x-powered-by');

var cors = require('cors')
app.use(cors())

const routes = require('./routes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/.netlify/functions/app", router);


app.use('/', routes);



app.use((req, res, next) => {
    res.status(404).json({
        status: 404,
        message: 'Resource not found'
    })
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 500,
        message: 'Internal server error'
    })
});

app.listen((process.env.PORT || 3000), () => {
    console.log(`\n--- Server listening on port ${process.env.PORT || 3000}`)
});


module.exports.handler = serverless(app);