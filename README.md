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
var databaseURL = '/path/to/globalsdb/install/mgr';
// or if you have the network deamon listening at fooserver.com on port 1234 
// var databaseURL = "globalsdb://fooserver.com:1234";
var db = new globals.Db(databaseURL);
db.connect([collections]);
db.foo.find({},function(error,result) {
	console.dir(result);
	// dumps out all the objects in the 'foo' collection
	db.close();		// clean up your connection!
});
```

Indexing
--------

Basic property level indexing is supported. To create an index:

``` js
db.cars.ensureIndex({model:1});
```
will create an index, and further writes to the cars collection will have the index on
'model' updated accordingly. If you already have cars in the collection, then you
should call
``` js
db.cars.reIndex();
```
to fully populate the index.
__NOTE__ Index creatation and managment APIs are not yet supported over remote
tcp connections. You need to run your client locally.

## globalsd

globalsd is a network deamon for the Globals database. It allows you to run your globalsjs client
across network connections.

To start:

>node globalsd/index.js <PORT|default 111105>--dbpath <path to GLOBALS_HOME, defaults process.env.GLOBALS_HOME>

The api automatically determines if you are running locally or connecting
to a remote globalsdb depending on the connection string. 
	
