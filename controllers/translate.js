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
var request = require('request');
var cheerio = require('cheerio');
var urlTool = require('url');

var logger = require('../config/logger');

// Print a default message
module.exports.translate = function (req, res, next) {
	
	// Get URL parameter
	var url = req.query.hasOwnProperty('url') ? req.query.url : -1;

	if (url === -1)
		return res.status(400).send('Translate URL - missing parameters: ' + JSON.stringify(req.query));
	else {

		var parsedUrl = urlTool.parse(url);
		req.session.lastReqDomain = parsedUrl.protocol + '//' + parsedUrl.hostname;

		// Request options
		var options = {
			url: url,
			strictSSL: false,
			maxRedirects: 8
		};

		
		return request(options, function (err, resp, body) {

			if (err) {
				logger.warn('Translate URL - error getting page content: ' + err);
				res.status(500).send(err);
			} else {

				var respCode = resp && resp.statusCode ? resp.statusCode : 500;

				if (respCode < 200 && respCode > 399) {
					logger.debug('Translate URL - bad response code from page: ' + respCode + ' - response: ' + JSON.stringify(resp));
					res.status(respCode).send(resp);
				} else {

					// Manipulate content
					var $ = cheerio.load(body);

					body = body.replace(/Connexun/g, 'Connexion');

					//Return page content
					res.status(200).send(body);
				}
			}
		});
	}
};