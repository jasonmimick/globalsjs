globalsjs
=========

a mongoish api for the globals database

A [node.js](http://nodejs.org) module for [Globals](http://globalsdb.org/), that emulates mongojs and [the official mongodb API](http://www.mongodb.org/display/DOCS/Home) as much as possible. 
It wraps Globals [node.js API](http://globalsdb.org/documentation/).  
The api emulation is not complete - if you are interested in building out more advanced
support please fork and dive in!

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

Many of the collection-level api calls support both synchronous and
asynchronous calls. However, some api calls do no as yet support async
invocation (for example, reIndex()).

Concepts
--------
Collections in globalsjs map directly to globals within the GlobalsDB storage
engine. Each object in a collection is a set of name/value pairs. Objects in
collections can all have the same properties or they can contain different
properties. However, most useful applications would normalize on standard
object structure per collection (otherwise it might be difficult to seach
over large collections by known properties).

Queries
-------
globalsjs supports a basic set of query operators and a syntax very similar
to that of the mongodb js-driver.
Queries are passed as a first argument to the find() method. For example, 
the follow code would find all the people younger than 20 in your collection:
``` js
db.people.find( { age : { $lt : 20 } }, function(err,results) { 
    console.dir(results);
});
```
globalsjs also supports compound query expressions which can be ANDed or ORed
together.
This example finds all the folks in their 20's in your collection
``` js
db.people.find( { $and : [ { age : { $gte : 20 } }, { age : { $lt : 30 } } ] },
                function( error, results ) {
                    console.dir(results);
});
```
The following query expression operators are supported:
$eq     equal
$nq    not equal
$gt     greater than
$gte    greater than or equal
$lt     less than
$lte    less than or equal


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

>node globalsd/index.js --port <PORT|default 11115> --dbpath <path to GLOBALS_HOME, defaults process.env.GLOBALS_HOME> --rest <PORT|optional management ui port, default 11125>

The api automatically determines if you are running locally or connecting
to a remote globalsdb depending on the connection string. 
	
When writing application code which expects to access the database over a remote
connection, it should be written such that it utilized the asynchronous method calls.

The management web-console provides a log of all transation calls from clients.

## Caché SQL Access 
In order to support SQL access to the collections, included in the globalsjs package 
is a Caché class which supports the automatic generation of a persistent Caché 
class for each of your collections. So, for a given collection a corresponding
Caché class is generated and it is through this class that one is able 
to access the data in the collection through SQL or any other supported
Caché means. Technically, a custom storage scheme is generated for the
class which points to the default global structure underneath your collection.

There is a deamon which one must start from within a Caché instance which can listen
for connections from the globaljs module and orchestrate the class generation
accrordingly. This of course requires a full Caché instance and license and is not
available in the free GlobalsDB package.

TODO - more setup/install instructions for this piece

## Caché Setup

    If running against a full licensed version of Caché, there are some additional
configuration parameters you may need to check.
    You need to make sure that the %Service_Callin is enabled.
    SMP -> System Administration -> Security -> Services -> %Service_Callin then check "Service Enabled" and Save

