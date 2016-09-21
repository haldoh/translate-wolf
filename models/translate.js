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

var logger = require('../config/logger');

module.exports.translateAndSend = function (res, body) {
	
	// Load content
	var $ = cheerio.load(body);

	// Do something with all the elements matching certain rules
	$('div * :not(script)').contents().filter(function(i, el) {
		if ((this.nodeType === 3) && (this.nodeValue.length > 50)) {
			return true;
		} else {
			return false;
		}
	}).parent().css({'color': 'yellow'});

	//Return page content
	res.status(200).send($.html());
};