/*
 * Copyright (C) 2016 Aldo Ambrosioni
 * ambrosioni.ict@gmail.com
 * 
 * This file is part of the translate-wolf project
 */

/*jslint node:true*/
/*jslint nomen:true*/
"use strict";

// Logger initialization
require('./config/logger').initialize();

// Configure express app and server
var server = require('./config/express')();

module.exports = server;