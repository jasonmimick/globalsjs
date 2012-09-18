globalsjs
=========

a mongoish api for the globals database

A [node.js](http://nodejs.org) module for [Globals](http://globalsdb.org/), that emulates mongojs and [the official mongodb API](http://www.mongodb.org/display/DOCS/Home) as much as possible. 
It wraps Globals [node.js API](http://globalsdb.org/documentation/).  
It is available through npm:

        npm install globalsjs

## Usage

globalsjs is very simple to use:

``` js
var globals = require('globalsjs');
var db = new globals.Db(databaseURL);
db.connect([collections]);
```

Indexing
--------

## globalsd

globalsd is a network deamon for the Globals database. It allows you to run your globalsjs client
across network connections.

To start:

	>globalsd/bin/globalsd --dbpath <path to GLOBALS_HOME, defaults process.env.GLOBALS_HOME>


Options:
	
