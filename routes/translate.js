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
var router = require('express').Router();
var translate = require('../controllers/translate');

router.route('/')
	// GET - translate and return given URL
	.get(translate.translate);

module.exports = router;