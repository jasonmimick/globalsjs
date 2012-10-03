var gdb = require('../../globalsjs');
var db = new gdb.Db();
db.connect();
console.dir( db.collections() );
var count = db.testsync.count();
console.dir(count);
console.log('count='+count);

db.foo.count(function(e,r) {
	console.log('async count');console.dir(r);
	db.close();
});


