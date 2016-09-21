/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the translate-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Requires
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var cors = require('cors');
var request = require('request');

var translate = require('../controllers/translate');

var logger = require('./logger');
var config = require('./config');

// Express config
module.exports = function () {

	/*
	 * Express configuration
	 */

	// Create app
	var app = express();

	// Parse JSON
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended: true
	}));

	// Use morgan for request logs
	app.use(morgan(config.morgan, {
		"stream": {
			write: function (message, encoding) {
				logger.info(message);
			}
		}
	}));

	// Session
	app.use(session({
		secret: 'TranslationSessionSecret54632',
		resave: false,
		saveUninitialized: true
	}));

	/*
	 * Routes
	 */

	// Enable cross-domain requests for all routes
	app.use(cors({
		origin: '*',
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		credentials: true,
		allowedHeaders: 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
	}));

	// Documentation - static
	app.use('/docs', express.static('docs'));
	// Static/generic routes
	app.use('/', require('../routes/static'));
	// Translate routes
	app.use('/translate', require('../routes/translate'));

	// Special 404 management
	app.use(translate.manage404Translate);

	/*
	 * HTTP server setup
	 */
	var server = require('http').createServer(app);
	server.listen(config.port);
	logger.info("Environment: " + config.mode);
	logger.info("HTTP server listening on port " + config.port);

	// Return the created server
	return server;
};