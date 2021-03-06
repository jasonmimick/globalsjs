/* 
	async_test.js
  Performs full test of async operations of globalsjs.
	** expected to run from ./test_driver.js harness **
*/ 
var util = require('util');
//var utd = require('./test_driver.js');
var assert = require('assert');
var cachedb = require('../../globalsjs');
var path = "/Users/jasonmimick/dev/globalsdb/mgr";
var LOAD_SIZE = 30;//5000;
var db = new cachedb.Db(path);
var x = db.connect({collections: ['testAsync']});
console.dir(x);
var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}

assert( (x.ok===1), "connect result.ok was not 1");
var dataset = [];
var favoriteFoods = ['pizza','ribeye','granola','wings','ceasar salad'];
var lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller'];
for (var i=0; i<LOAD_SIZE; i++) {
	dataset.push( { firstName : 'Jim Jimmy'+i,
									lastName : lastNames[Math.floor(Math.random()*lastNames.length)],
									age : Math.floor(Math.random()*100),
									food : favoriteFoods[Math.floor(Math.random()*favoriteFoods.length)],
									id : UUIDv4() });
}
assert.equal(dataset.length, LOAD_SIZE, "dataset init failed");
var removeResult = db.testAsync.remove();
assert( removeResult.ok === 1, "remove of 'testAsync' collection failed");
dataset.forEach( function(obj) {
	db.testAsync.save(obj);
});
console.log("ASYNC!!!!!!!");
// read back
var resultCounter = 0;
db.testAsync.find({}, function(error, results) {

	resultCounter++;
	console.dir(results);
	console.log('resultCounter=',resultCounter);
	if ( resultCounter == LOAD_SIZE ) {
		/// CANNOT RUN PARALLEL ASYNC QUERIES!
		for(var i=0; i<0/*favoriteFoods.length*/; i++) {
			var query = {food : favoriteFoods[i] };
			db.testAsync.find( query , function(err,results2) {
				console.log('find query--');
				console.dir(query); 
				console.dir(err);
				console.dir(results2);
			});
		}
	}
});
/*
function next_step() {
	db.testAsync.ensureIndex( { food : 1 } );
	db.testAsync.reIndex();
	for(var i=0; i<favoriteFoods.length; i++) {
		var query = {food : favoriteFoods[i] };
		console.log('find query--');
		console.dir(query); 

		db.testAsync.find( query , function(err,results2) {
			console.dir(err);
			console.dir(results2);
		});
	}
}
*/
/*
db.testAsync.find( { food : 'pizza' }, function(error, results) {
	console.log('pizza query');
	console.dir(error);
	console.dir(results);
});
*/
	/*
	var bson = require('mongodb').pure().BSON;
	var obj = { name:'bison',location:'out west',feeling:'groovy'};
	var s = bson.serialize(obj);
	console.dir(s);
	db.testsync.save(s);
	db.close();
	*/
	//process.exit(0);




