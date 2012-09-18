var util = require('util');
var path = "/Users/jasonmimick/dev/globalsdb/mgr";
var LOAD_SIZE = 100;

var cache = require('cache');
var gdb = new cache.Cache();
var open = gdb.open( { path : path, userName : 'foo', password : 'foo', namespace : 'foo' }); 
/*
var bson = require('mongodb').pure().BSON;
var obj = { name:'bison',location:'out west',feeling:'groovy'};
var s = bson.serialize(obj);
console.dir(s);
var bsonGloRef = { global : 'bson', subscript : [1], data : s };
var save = gdb.set(bsonGloRef);
*/
var lo = 0, hi = 500;
//var testsync = gdb.retrieve( { global : 'testsync', lo: lo, hi : hi },'list');
//console.dir(testsync);
/*
var objects = readObjectIds(lo, hi);
var keepRunning = true;
while ( keepRunning ) {
	lo = hi+1;
	hi = lo+500;
	var nextSet = readObjectIds(lo, hi);
	if ( nextSet.length === 0 ) { keepRunning = false; }
	console.dir(nextSet);
}
*/
//console.dir(objects);

/*
objects.forEach( function(id) {
	var obj = gdb.retrieve( { global : 'testsync', subscripts : [id]}, 'object' );
	console.dir(obj);
});
*/
//var testsync = gdb.retrieve( { global : 'testsync' },'array');
//console.dir(testsync);


function readObjectIds(lo, hi) {
	return gdb.retrieve( { global : 'testsync', lo: lo, hi : hi, max : 50 },'list');
}

// in order to real queries to work, we need to read chucks
// and stream them to the query filter,
// if there is an index, then that should be used.
var maxNumObjects = gdb.get( { global : 'testsync', subscript :  [] } ).data;
console.log('maxNumObjects=');console.dir(maxNumObjects);
var readChunkSize = 50;		// maximum number of 'object's I can read is 63??
function find(id_processor) {
	var numObjectsRead = 0;
	var lo = 0, high = readChunkSize;
	while ( numObjectsRead < maxNumObjects ) {
		var ids = readObjectIds(lo, hi);
		console.dir(ids);
		lo = hi + 1;
		hi = hi + readChunkSize;
		numObjectsRead = numObjectsRead + ids.length;
		console.log('numObjectsRead='+numObjectsRead+' ids.length='+ids.length);
		if ( ids.length > 0 ) {
			id_processor( ids );
		} else {
			break;
		}
	}
}
find( function(ids) {
	var rlo = ids[0];
	var rhi = ids[ids.length-1];
	console.log('find rlo='+rlo+' rhi='+rhi);
	var data = gdb.retrieve( { global : 'testsync', lo : ids[0], hi : ids[ids.length-1] },'object');
	console.dir(data);
});


gdb.close();
	
