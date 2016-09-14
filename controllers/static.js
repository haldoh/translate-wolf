/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the translate-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Print a default message
module.exports.defaultMessage = function (req, res) {
	res.status(200).send('translate-wolf - Language translation layer for Wolf\'s applications.');
};