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
var async = require('async');

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
			maxRedirects: 8,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				'Pragma': 'no-cache',
				'Expires': 0
			}
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

					// Replace references to style and js files
					return replaceExtFiles(req, body, function (extBody) {

						// Replace URLs
						return replaceUrls(req, extBody, function (urlBody) {
						
							// Translate content and send back
							return translate.translate(urlBody, function (transBody) {
								res.status(200).send(transBody);
							});
						});
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
		maxRedirects: 8,
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': 0
		}
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
				
				// Replace references to style and js files
				return replaceExtFiles(req, body, function (extBody) {

					// Replace URLs
					return replaceUrls(req, extBody, function (urlBody) {
					
						// Translate content and send back
						return translate.translate(urlBody, function (transBody) {
							res.status(200).send(transBody);
						});
					});
				});
			}
		}
	});
};

// Replace URLs in a page with the translation URL
var replaceUrls = function (req, body, done) {

	// Load content
	var $ = cheerio.load(body);

	var aColl = $('a').filter(function(i, el) {
			return (
				$(this).attr('href') &&
				(
					$(this).attr('href').indexOf('http') === 0 ||
					$(this).attr('href').indexOf('/') === 0
				)
			);
		});

	// Use async to go through the URLs, change them,
	// and return the changed HTML code when done
	async.each(
		// Collection of a elements to iterate
		aColl,
		// Substitution function
		function (item, callback) {
		
			async.setImmediate(function () {

				if ($(item).attr('href').indexOf('http') === 0) {
					// Replace for absolute URLs
					$(item).attr('href', req.protocol + '://' + req.get('host') + '/translate?url=' + $(item).attr('href'));
				} else if ($(item).attr('href').indexOf('/') === 0) {
					// Replace for relative URLs
					$(item).attr('href', req.protocol + '://' + req.get('host') + '/translate?url=' + req.session.lastReqDomain + $(item).attr('href'));
				}
				
				// Done
				callback();
			});
		},
		// Done function
		function (err) {
			if (err)
				logger.warn('Async library error while replacing URLs: ' + err);
			done($.html());
		}
	);
};

// Replace URLs in a page with the translation URL
var replaceExtFiles = function (req, body, done) {

	// Load content
	var $ = cheerio.load(body);

	// Get link elements with external ref
	var linkColl = $('link[href]');

	// Get script elements with external ref
	var scriptColl = $('script[src]');

	// Put all replacement tasks in an array for async execution
	var asyncTasks = [];

	// Links tasks
	linkColl.each(function (i, item) {

		asyncTasks.push(function (callback) {

			async.setImmediate(function () {
				// Change only relative URLs
				if ($(item).attr('href') && $(item).attr('href').indexOf('http') !== 0) {
					var prefix = req.session.lastReqDomain;
					prefix += $(item).attr('href').indexOf('/') === 0 ? '' : '/';
					$(item).attr('href', prefix + $(item).attr('href'));
				}

				// Done
				callback();
			});
		});
	});

	// Scripts tasks
	scriptColl.each(function (i, item) {

		asyncTasks.push(function (callback) {

			async.setImmediate(function () {
				// Change only relative URLs
				if ($(item).attr('src') && $(item).attr('src').indexOf('http') !== 0) {
					var prefix = req.session.lastReqDomain;
					prefix += $(item).attr('src').indexOf('/') === 0 ? '' : '/';
					$(item).attr('src', prefix + $(item).attr('src'));
				}

				// Done
				callback();
			});
		});
	});

	// Run tasks
	async.parallel(asyncTasks, function () {
		// Done
		done($.html());
	});
};