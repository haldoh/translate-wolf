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
var cheerio = require('cheerio');
var async = require('async');

var logger = require('../config/logger');

module.exports.translate = function (body, done) {
	
	// Load content
	var $ = cheerio.load(body);

	// Get all text elements matching the given filter
	var textElems = $('body * :not(script)')
		.contents()
		.filter(function(i, el) {
			if ((this.nodeType === 3) && (this.nodeValue.trim().length > 5)) {
				return true;
			} else {
				return false;
			}
		});

	// Use async to process elements
	async.each(
		textElems,
		function (item, callback) {

			async.setImmediate(function () {

				// Check parent's parent contents
				var parentContent = $(item)
					.parent()
					.parent()
					.contents()
					.filter(function(i, el) {
						if ((this.nodeType === 3) && (this.nodeValue.trim().length > 5)) {
							return true;
						} else {
							return false;
						}
					});

				if (parentContent.length <= 0) {
					// Process item
					$(item)
						.parent()
						.addClass('already-here')
						.attr('data-tooltip', $(item).parent().html().replace(/<[a-zA-Z\/][^>]*>/g, ' ').trim());
				}
				
				// Done
				return callback();
			});
		},
		function (err) {

			// Return page content
			return done($.html());
		});
};

module.exports.addCustomFiles = function (reqProtocol, reqHost, body, callback) {

	// Load content
	var $ = cheerio.load(body);

	// Add reference to qTip style file
	$('head').append('<link rel="stylesheet" type="text/css" href="' + reqProtocol + '://' + reqHost + '/stylesheets/jquery.qtip.min.css"/>');

	// Add reference to custom style file
	$('head').append('<link rel="stylesheet" type="text/css" href="' + reqProtocol + '://' + reqHost + '/stylesheets/translate-wolf.css"/>');

	// Add reference to jQuery lib - only if missing
	var jqueryScripts = $('script[src*=jquery]');
	if (jqueryScripts.length === 0)
		$('body').append('<script type="text/javascript" src="' + reqProtocol + '://' + reqHost + '/javascripts/lib/jquery-2.1.1.min.js"/>');

	// Add reference to qTip js script
	$('body').append('<script type="text/javascript" src="' + reqProtocol + '://' + reqHost + '/javascripts/lib/jquery.qtip.min.js"/>');

	// Add reference to custom js script
	$('body').append('<script type="text/javascript" src="' + reqProtocol + '://' + reqHost + '/javascripts/translate-wolf.js"/>');

	// Retur npage content
	return callback($.html());
};