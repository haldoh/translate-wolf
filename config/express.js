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
	app.use(function (req, res, next) {

		// Request options
		var options = {
			url: req.session.lastReqDomain + req.url,
			strictSSL: false,
			maxRedirects: 8
		};

		return request(options, function (err, resp, body) {

			if (err) {
				logger.warn('404 management - error trying to find missing content: ' + err);
				return next();
			} else {

				var respCode = resp && resp.statusCode ? resp.statusCode : 500;

				if (respCode < 200 && respCode > 399) {
					logger.warn('404 management - bad response code from page: ' + respCode + ' - response: ' + JSON.stringify(resp));
					return next();
				} else {
					//Return page content
					return res.status(200).send(body);
				}
			}
		});
	});

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