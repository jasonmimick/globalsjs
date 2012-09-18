/* 
	sync_test.js
  Performs full test of sync operations of globalsjs.
	** expected to run from ./test_driver.js harness **
*/ 
var util = require('util');
var utd = require('./test_driver.js');
var cachedb = require('./globalsjs');
var path = "/Users/jasonmimick/dev/globalsdb/mgr";
var LOAD_SIZE = 100;
var db = new cachedb.Db(path);
var x = db.connect({collections: ['testsync']});

var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}

utd.__assertTrue( (x.ok===1), "connect result.ok was not 1");
var dataset = [];
for (var i=0; i<LOAD_SIZE; i++) {
	dataset.push( { name : 'Jim Jimmy'+i,
									age : Math.floor(Math.random()*100),
									id : UUIDv4() });
}
utd.__assertEquals(dataset.length, LOAD_SIZE, "dataset init failed");

var removeResult = db.testsync.remove();
utd.__assertTrue ( removeResult.ok === 1, "remove of 'testsync' collection failed");
dataset.forEach( function(obj) {
	db.testsync.save(obj);
});

console.log("ASYNC!!!!!!!");
// read back
db.testsync.find({}, function(error, results) {

	console.log('results.length='+results.length);
	utd.__assertEquals(results.length, LOAD_SIZE, "did not read back "+LOAD_SIZE+" object from db");
	
	/*
	var bson = require('mongodb').pure().BSON;
	var obj = { name:'bison',location:'out west',feeling:'groovy'};
	var s = bson.serialize(obj);
	console.dir(s);
	db.testsync.save(s);
	db.close();
	*/
	//process.exit(0);
});





