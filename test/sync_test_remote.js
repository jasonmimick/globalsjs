/* 
	sync_test.js
  Performs full test of sync operations of globalsjs.
	** expected to run from ./test_driver.js harness **
*/ 
var util = require('util');
var cachedb = require('../../globalsjs');
var path = "globalsdb://localhost";
//var db = new cachedb.Db(path, { resultMode : 'stream' } );
var db = new cachedb.Db(path, { resultMode : 'batch' } );
var x = db.connect({collections: ['testsync']}, function(e,r) {
	// read back
	console.dir(db);
	db.testsync.find({food:'granola'},function(err,res) {
		console.dir(res);
		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
		// don't call close here, the api will stream each object back one by one.
		// here - we can call close, if we are in batch mode - 
		// the client will stream us all the results for this operation
			
		//console.dir(db);
		// update the last object 
		var obj = res[res.length-1];
		obj.lastUpdate = (new Date()).toString();
		console.dir(obj);
		db.testsync.save(obj,function(error,result) {
			console.dir(result);
			var o = { __ID: 51, name : 'foo', age: 22};
			db.testsync.remove(o,function(e2,r2) {
				console.dir(r2);
				db.close();
			});
		});
	});
});
//process.on('exit', function() { db.close(); } );
