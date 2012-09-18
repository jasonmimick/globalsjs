/* 
	sync_test.js
  Performs full test of sync operations of globalsjs.
	** expected to run from ./test_driver.js harness **
*/ 
var util = require('util');
var utd = require('./test_driver.js');
//var cachedb = require('./globalsjs/lib/cachedb.js');
var cachedb = require('../../globalsjs');
var path = "/Users/jasonmimick/dev/globalsdb/mgr";
var LOAD_SIZE = 50;
var db = new cachedb.Db(path);
var x = db.connect({collections: ['testsync']});
//var x = db.connect();

var UUIDv4 = function b(a){return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,b)}

utd.__assertTrue( (x.ok===1), "connect result.ok was not 1");
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
utd.__assertEquals(dataset.length, LOAD_SIZE, "dataset init failed");

var removeResult = db.testsync.remove();
utd.__assertTrue ( removeResult.ok === 1, "remove of 'testsync' collection failed");
dataset.forEach( function(obj) {
	db.testsync.save(obj);
});

// read back
var dataset2 = db.testsync.find();
//console.dir(dataset2);
utd.__assertEquals(dataset2.length, LOAD_SIZE, "did not read back "+LOAD_SIZE+" object from db");
// find and remove the first one
var firstObj = db.testsync.findOne();
//console.dir(firstObj);
utd.__assertEquals( firstObj.firstName, 'Jim Jimmy0', "findOne did not return the first object");
//debugger;
//utd.__assertTrue( (1===0), "Did this test work?");
removeResult = db.testsync.remove(firstObj);
//console.dir(removeResult);
utd.__assertTrue ( removeResult.ok === 1, "remove of "+util.inspect(firstObj)+" collection failed");

// check there are LOAD_SIZE-1 objects in the db now.
var set3 = db.testsync.find();
//console.log('set3.length='+set3.length);
utd.__assertEquals(set3.length, (LOAD_SIZE-1), "after removing first length was not "+(LOAD_SIZE-1));

// check find with query
utd.__assertTrue( LOAD_SIZE > 4, "LOAD_SIZE needs to be at least 5");
var jim4query = { firstName : 'Jim Jimmy4'};
var jim4 = db.testsync.findOne( jim4query );
//console.dir(jim4);
utd.__assertEquals( jim4.firstName, 'Jim Jimmy4', 'query='+util.inspect(jim4query)+' fail. '+util.inspect(jim4));

// update
// BUG here - the 1/2 character blows up
//var car = "1973 ½ Porsche 911T Targa";
var car = "1973 1/2 Porsche 911T Targa";
jim4.car = car;
var saveResult = db.testsync.save(jim4);
utd.__assertTrue(saveResult == 0, "Updating jim4 and saving failed");

var newJim4 = db.testsync.findOne( jim4query );
utd.__assertTrue( newJim4.car === car, "newJim4's car was not right " + util.inspect(newJim4));


// ensureIndex tests...
// ensureIndex will just add a new index - it does not rebuild for existing objects
db.testsync.ensureIndex( { "lastName" : 1 } );
// now if we save jim4 again, the index should get updated.
saveResult = db.testsync.save(jim4);
db.testsync.ensureIndex( { "food" : 1 } );
db.testsync.reIndex();

// create collection on the fly
var stores = db.createCollection('stores');
db.stores.save( { name : 'Starbucks', wifi : true });
db.stores.save( { name : 'Tony\'s NY Pizza Pie', wifi : false, food : true });
db.stores.save( { name : 'Don\s Muffler House', wifi : true, cost : '$$$$$' });
utd.__assertEquals( db.stores.find().length,3, "dyno add collection, save one doc, result size not 1" );
db.stores.remove();
// make sure there are no objects
var anyStores = db.stores.find().length;
utd.__assertEquals( anyStores, 0, "Remove of all stores failed");

db.close();



