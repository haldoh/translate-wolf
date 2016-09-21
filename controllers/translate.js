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

var translate = require('../models/translate');

var logger = require('../config/logger');

// Translate the given URL and return the modified page
module.exports.translate = function (req, res, next) {
	
	// Get URL parameter
	var url = req.query.hasOwnProperty('url') ? req.query.url : -1;

	if (url === -1)
		return res.status(400).send('Translate URL - missing parameters: ' + JSON.stringify(req.query));
	else {

		// Parse URL and store last visited domain
		var parsedUrl = urlTool.parse(url);
		req.session.lastReqDomain = parsedUrl.protocol + '//' + parsedUrl.hostname;

		// Request options
		var options = {
			url: url,
			strictSSL: false,
			maxRedirects: 8
		};

		// Visit page
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

					// Replace absolute URLs
					return replaceUrls(req, body, function (newBody) {
					
						// Translate content and send back
						return translate.translateAndSend(res, newBody);
					});
				}
			}
		});
	}
};

// Intercept a missing page and try to get it from the last visited domain
module.exports.manage404Translate = function (req, res, next) {
	
	logger.debug('Try to visit path before returing 404 ' + req.session.lastReqDomain + req.url);

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
				
				// Replace absolute URLs
				return replaceUrls(req, body, function (newBody) {
					
					// Translate content and send back
					return translate.translateAndSend(res, newBody);
				});
			}
		}
	});
};

// Replace URLs in a page with the translation URL
var replaceUrls = function (req, body, callback) {

	// Load content
	var $ = cheerio.load(body);

	// Counters for a elements selection and substitution
	var counterCheck = 0;
	var counterExec = 0;

	// Select all the a elements
	$('a').filter(function(i, el) {

		// Increment check counter
		counterCheck += 1;

		// logger.debug('This: ' + $(this).parent().html());
		// logger.debug('href: ' + $(this).attr('href'));
		
		return true;
	}).each(function () {
		
		// Replace URL
		$(this).attr('href', 'http://' + req.get('host') + '/translate?url=' + $(this).attr('href'));
		
		// Increment execution counter
		counterExec += 1;
		logger.debug('Checking counters: ' + counterExec + '/' + counterCheck);
		if (counterExec >= counterCheck)
			return callback($.html());
	});

	if (counterCheck === 0 && counterExec === 0)
		return callback(body);
};