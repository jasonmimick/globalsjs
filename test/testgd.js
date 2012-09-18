//var gd = require('./gd.js');
var callback = function(results) { console.log(results); }

//gd.list_globals("USER",callback);
//gd.list_globals("%SYS",callback);
//gd.list_globals("SAMPLES",callback);
//gd.list_globals("GLOBALSDB",callback);

var mycache = require('./globalsjs/lib/cachedb.js');
var path = "/Users/jasonmimick/dev/globalsdb/mgr";
var db = new mycache.Db(path, {namespace: 'GLOBALSDB'}, { option1: 'option1value'});
db.connect({namespace: 'GLOBALSDB', collections: ['foo']}, function(error,results) {
	//console.log(db);
	/*
	Object.keys(db).forEach(function(key) {
		console.log('db.'+key+'='+db.key);
	});
	*/
	/*
	var globals = [ 'foo', 'gdbCompanyA' ];
 	globals.forEach( function(glb) {
		db[glb].find({}, function(error, results) {
			if ( error ) {
				console.dir(error);
			} else {
				console.dir(results);
			}
		});
	});
	*/
	/*
	var newFoo = { name : "Panera", address : "1 Main Street, Warrenton VA 20187" };
	newFoo.specialty = ['free internet', 'okay coffee'];
	newFoo.lastLogin = new Date();
	db.foo.add( newFoo, function(error, results) {
		console.dir(error);
		console.dir(results);
		
	
	});
	*/
	/*
	var a = { hobby : "Fly Fishing", location : "Vermont", flies : ['a','b','c']};
	a.lastLogin = (new Date()).toString();
	a.drink = "Original Seltzer";
	a.abc = "xyz" + (new Date());
	var syncResult = db.foo.add( a );
	console.dir(syncResult);
	*/
	//var syncFind = db.foo.find({subscripts : [2]});
	//var syncFind = db.foo.find();
	//console.dir(syncFind);
	var addr = { street : "1 main", city : "Washington DC", state : "District" };
	var date = new Date();

	addr.lastUpdate = { day : date.getDay(), time : date.getTime() }; 
	var addResult = db.foo.add( { name : "Obama", address : addr });
	console.log('addResult='+addResult);
	//	var filteredSyncFind = db.foo.find( { address : { state : "District" } });
	var mrObama = db.foo.findOne( { name : "Obama" } );
	console.dir(mrObama);

	//console.dir(filteredSyncFind);
	mrObama.party = "Donkies"+(new Date()).toString();
	console.dir(mrObama);
	var saveResult = db.foo.save(mrObama);
	console.log('saveResult = ' + saveResult);

	// save will do an add for free if it's not there:
	// BUG - HERE - see 'string_too_long_bug.js' 
	//db.foo.save( process.env );
	db.foo.remove(mrObama);
	var noDbObjectYet = { band : 'Umph', sound : 'good', song : 'Great American' };
	try {
		db.foo.remove(noDbObjectYet);
	} catch (exception) {
		console.log("We are expecting this exception...");
		console.dir(exception);
	}

	/*
	db.foo.find( { location : 'Vermont' }, function(error, results) {
		console.log('async baby');
		console.dir(results);
	});
	*/
});


