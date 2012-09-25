/* 
	sync_test.js
  Performs full test of sync operations of globalsjs.
	** expected to run from ./test_driver.js harness **
*/ 
var util = require('util');
var cachedb = require('../../globalsjs');
var path = "globalsdb://localhost:4321";
var db = new cachedb.Db(path, { resultMode : 'stream' } );
console.dir(db);
var x = db.connect({collections: ['testsync']}, function(e,r) {
	// read back
	db.testsync.find({food:'granola'},function(err,res) {
		console.dir(res);
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		// don't call close here, the api will stream each object back one by one.
		// here - we can call close, if we are in batch mode - 
		// the client will stream us all the results for this operation
		//db.close();
	});
});
//process.on('exit', function() { db.close(); } );
