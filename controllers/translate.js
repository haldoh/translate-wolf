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

		return requestAndTranslate(req.protocol, req.get('host'), req.session.lastReqDomain, url, function (transErr, transBody) {
			if (transErr) {
				logger.warn('Transalte error: ' + transErr);
				res.status(500).send(transErr);
			} else
				res.status(200).send(transBody);
		});	
	}
};

// Intercept a missing page and try to get it from the last visited domain
module.exports.manage404Translate = function (req, res, next) {
	
	logger.debug('Try to visit path before returing 404 ' + req.session.lastReqDomain + req.url);

	var url = req.session.lastReqDomain + req.url;

	return requestAndTranslate(req.protocol, req.get('host'), req.session.lastReqDomain, url, function (transErr, transBody) {
		if (transErr) {
			logger.warn('Transalte error: ' + transErr);
			res.status(500).send(transErr);
		} else
			res.status(200).send(transBody);
	});	
};

// Request a page and manipulate content
var requestAndTranslate = function (reqProtocol, reqHost, reqLastDomain, url, callback) {

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
			callback(err, null);
		} else {

			var respCode = resp && resp.statusCode ? resp.statusCode : 500;

			if (respCode < 200 && respCode > 399) {
				callback(new Error('Bad response code from page: ' + respCode + ' - response: ' + JSON.stringify(resp)), null);
			} else {	

				// Replace references to style and js files
				return replaceExtFiles(reqLastDomain, body, function (extBody) {

					// Replace URLs
					return replaceUrls(reqProtocol, reqHost, reqLastDomain, extBody, function (urlBody) {
					
						// Add custom files (JS, CSS, etc...)
						return translate.addCustomFiles(reqProtocol, reqHost, urlBody, function (styleBody) {

							// Translate content and send back
							return translate.translate(styleBody, function (transBody) {
								callback(null, transBody);
							});
						});
					});
				});
			}
		}
	});
};

// Replace URLs in a page with the translation URL
var replaceUrls = function (reqProtocol, reqHost, reqLastDomain, body, done) {

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
					$(item).attr('href', reqProtocol + '://' + reqHost + '/translate?url=' + $(item).attr('href'));
				} else if ($(item).attr('href').indexOf('/') === 0) {
					// Replace for relative URLs
					$(item).attr('href', reqProtocol + '://' + reqHost + '/translate?url=' + reqLastDomain + $(item).attr('href'));
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
var replaceExtFiles = function (reqLastDomain, body, done) {

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
					var prefix = reqLastDomain;
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
					var prefix = reqLastDomain;
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