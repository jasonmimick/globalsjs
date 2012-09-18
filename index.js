function debug(msg) {
	if ( !(process.env.GLOBALSJS_DEBUG_OUTPUT === 'true') ) { return; }
	if ( typeof msg === 'object' ) { 
		console.dir(msg); 
	} else {
		console.log(msg);
	}
	var args = arguments;
	if ( args.length>1 ) {
		for (var i=1; i<args.length; i++) {
			if ( typeof args[i] === 'object' ) {
				console.dir(args[i]);
			}
		}
	}
	if ( (process.env.GLOBALSJS_DEBUG_TRACE === 'true') ) { 
		console.trace();
	}
}
var EventEmitter = require('events').EventEmitter,
 		inherits = require('util').inherits,
		cache = require('cache'),
		util = require('util');
var noop = function() {};
var isEmptyObject = function(o) {
		for(var x in o) { return false; }  // this is how jQuery checks 'isEmptyObject'
		return true;
}
// proxy the mongodb Server,Db and Collection
// object with a globalsdb/cache backing
// each collection will map to one global
// each collection global will have a reserve "system managed" subscript with the
// index's you specify by calling "ensureIndex", otherwise, each object
// uses the increment() api call to get a primary key.
// constants---

// TODO - move this to private utils object
function gotCallback(callback) {
	return ( (callback !== undefined) && (typeof callback === 'function') );
}

var COLLECTION_INDEX_IDENTIFIER = "1gdb";
var COLLECTION_SYSTEM_IDENTIFIER = "5gdb";
var COLLECTION_SYSTEM_GLOBALS_ENDSWITH = [ COLLECTION_INDEX_IDENTIFIER, COLLECTION_SYSTEM_IDENTIFIER ];
Collection.non_system_global = function(name) {
	for(var i=0; i<COLLECTION_SYSTEM_GLOBALS_ENDSWITH.length; i++) {
		var ident = COLLECTION_SYSTEM_GLOBALS_ENDSWITH[i];
		if ( name.indexOf(ident, name.length-ident.length) !== -1 ) { 
			return false;
		}
	}
	return true;
} 
/*
A Collection maps directly to a global in Cache, one in which
objects are stored via the globalsdb/node.js api (update/retrive 'object')
*/
function Collection(collectionName, dbInstance) {
	var self = this;

	self.name = collectionName;
	self.db = dbInstance;
	self.indexes = [];
	self.filter_results = filter_results;
	self.first_object = first_object;
	self.fetch_glo_ref_from_object = fetch_glo_ref_from_object;
	self.convert_object_list_to_array = convert_obj_list_to_array;
	self.load_indexes = load_indexes;
	self.update_index = update_index;
	self.start_query_stats = start_query_stats;
	self.stop_query_stats = stop_query_stats;
	self.build_index_glo_ref_from_query=build_index_glo_ref_from_query;
	self.spin_find = spin_find;
	self.spin_find_index = spin_find_index;
	self.index_glo_ref = function() {
		return { global : self.name+COLLECTION_INDEX_IDENTIFIER, subscripts : [] };
	};
	self.system_glo_ref = function () {
		return { global : self.name+COLLECTION_SYSTEM_IDENTIFIER, subscripts : [] };
	};

	self.load_indexes();	// array of property names to index for each object in the collection
	// the globalsdb 'object' retrieve api does not return a friendly
	// array, rather one big object, to facilitate iteration
	// over a collection, this util will convert to an array - a la mongojs
	function convert_obj_list_to_array(results) {
		var array = [];
		Object.keys(results.object).forEach( function(id) {
			var obj = results.object[id];
			if ( obj.__ID !== undefined ) {		// only push real objects
				array.push( results.object[id] );
			}
		});
		return array;
	}
	function init() {
		// load system data about this collection, if any...
	}
	function spin_find(gdb,glo_ref,query,callback) {
		gdb.order(glo_ref, function(e,resultXX) {
			debug('spin_find order callack');
			debug(resultXX);
			if ( resultXX.result !== '' ) { 
				var gr = { global : resultXX.global, subscripts : resultXX.subscripts };
				debug('async scan order spin', gr);
				gdb.retrieve( gr, 'object', function(error,result) {
					var sendResultToCaller = false;
					debug(query);
					if ( !isEmptyObject(query) ) {
						var resultKeys = Object.keys(result.object);
						for(var i=0;i<resultKeys.length;i++) {
							if ( query[resultKeys[i]] !== undefined ) {
								if ( query[resultKeys[i]]==result.object[resultKeys[i]] ) {
									sendResultToCaller = true;
								}
							}
						}
					} else {
						sendResultToCaller = true;
					}
					if ( sendResultToCaller ) {
						callback(error,result.object);  // send results to caller
					}
					self.spin_find(gdb,gr,query,callback); // find more
				});
			} else { // we're done, close the connection
				//gdb.close();
				console.log('ran off end?');console.dir(resultXX);
				return;
			} 	
		});
	}
	function spin_find_index(gdb,glo_ref,callback) {
		debug('spin_find_index() glo_ref',glo_ref);
		gdb.order(glo_ref, function(error,resultXX) {
			if ( error ) { 
				console.dir(error);console.dir(resultXX);
				console.dir(glo_ref);
				callback(error,{});
				return;
			}
			debug('spin_find_index order callback error ++++++++++++++++++++++');
			debug(error);
			debug('spin_find_index order callback resultXX **********************');
			debug(resultXX);
			if ( resultXX.result !== '' ) { 
				var gri = { global : resultXX.global, subscripts : resultXX.subscripts };
				var gr = { global : self.name, subscripts : [resultXX.result] };
				//console.log('gri');console.dir(gri);
				//console.log('gr');console.dir(gr);
				//debug('async scan order spin', gr, gri);
				gdb.retrieve( gr, 'object', function(error,result) {
					//console.dir('spin_find_index,retrieve callback ~~~~~~~~~~~~~~~~~~~~~~');
					//console.dir(error);console.dir(result);
					callback(error,result.object);  // send results to caller
					self.spin_find_index(gdb,gri,callback); // find more
				});
			} else { // we're done, close the connection
				//try {
				gdb.close();
				//} catch(exp) { console.dir(exp); }
			} 	
		});
	}
	function load_indexes() {
		var index = '';
		var glo_ref = self.system_glo_ref();
		glo_ref.subscripts.push( 'index', '' ); 
		debug(glo_ref);
		while ( ( result= self.db.cacheConnection.order(glo_ref)).result != '') {
			var indexObj = {};
			indexObj[result.result]=1;
			self.indexes.push(indexObj);
			debug(self.indexes);
			glo_ref = { global : result.global, subscripts : result.subscripts }; 
		}
		debug('load_indexes()' + self.name);debug(self.indexes);
	}
	// can take single obj or array of collection items
	// called on save/add
	self.index_operation = {
		SAVE : 0,
		REMOVE : 1
	};
	//debug(self.index_operation);
	function update_index(operation, obj, callback) {
		debug('update_index');debug(arguments);
		if ( operation == self.index_operation.SAVE ) {
			__update_index(operation, obj, callback);
		} else if ( operation == self.index_operation.REMOVE ) {
			__update_index(operation, obj, callback);
		} else {
			var error = 'update_index unsupported operation='+util.inspect(operation);
			debug(error);
			if ( gotCallback(callback) ) { callback(error,null) }
			return error;
		}
	}
	function __update_index(operation,obj, callback) {
		var glo_ref = self.index_glo_ref();
		debug('__update_index_save');debug(arguments);
		if ( obj === undefined ) {
			//console.trace();
			//debug(glo_ref);
			if ( operation == self.index_operation.REMOVE ) {
					var sc = self.db.cacheConnection.kill(glo_ref);
					//debug(sc);
					var sys = self.system_glo_ref();
					sys.subscripts.push('index');
					sc = self.db.cacheConnection.kill(sys);
					return;
			}
		} 
		if (!( obj instanceof Array )) {
			obj = [ obj ];
		}
		debug(obj);
		debug(self.indexes);
		for(var i=0; i<obj.length; i++) {
			// what is another process adds an index - how will we know???
			for(var j=0; j<self.indexes.length; j++) { 
				debug(j+'===>'+self.indexes[j]);
				var index_key = Object.keys(self.indexes[j])[0];
				var index_collation_order = self.indexes[j][index_key];
				debug('index_collation_order='+index_collation_order);
				// TODO implement collation order
				debug('index_key='+index_key);
				if (obj[i][index_key]!==undefined) { 	// this obj has a prop for this index
					var value = obj[i][index_key];
					glo_ref.subscripts = [ index_key, value, obj[i]['__ID'] ];
					glo_ref.data = '';
					debug(glo_ref);
					if ( operation == self.index_operation.SAVE ) {
						var sc = self.db.cacheConnection.set(glo_ref);
					} else if ( operation == self.index_operation.REMOVE ) {
						var sc = self.db.cacheConnection.kill(glo_ref);
					} 

					// TODO deal with async callback
					debug(sc);
				}
			}
		} 
		debug('leaving update_index');
	}
	function first_object(resultSet) {		// pull out the first object and return
		var first = false;
		for(var key in resultSet) {
			return resultSet[key];
		}		
	}
	
	function filter_results(query, results, callback) {
		// if the query is {}, then just return the
		// results converted to the array format
		var empty = true;
		for(var x in query) { empty = false; }  // this is how jQuery checks 'isEmptyObject'
		if ( empty ) { return self.convert_object_list_to_array(results); }
		var filtered = [];
		//debug(results);
		//debug(query);
		//for(var id in results.object ) {
		for(var i=0; i<results.length; i++) {
			//var obj = results.object[id];
			var obj = results[i];
			// very simple query options now...
			for(var property in query ) {
				if ( obj[property] !== undefined ) {
					if ( obj[property] === query[property] ) { 	// passes
						filtered.push( obj );
					}
				}
			}
		}	
		//debug(filtered);
		//filtered = self.(filtered);
		if ( gotCallback(callback) ) {
			callback({},filtered);
		} else {
			return filtered;
		}
	}
	/* returns a globalsdb/node.js-api "global ref"
		from a 'normal' object which has an '__ID' property,
		a la' the 'object' api
	*/
	function fetch_glo_ref_from_object(object) {
		if ( object === undefined ) {  // no object, just return a ref to the collection~=global
			return { global : self.name, subscripts : [] };
		}
		if ( object.__ID === undefined ) {
			throw new Error("object unformatted");
		}
		var glo_ref = {};
		glo_ref= { global : self.name, subscripts : [object.__ID] };
		return glo_ref;
	}

	// query stats
	function start_query_stats(query) {
		var self = this;
		var stat = new QueryStat(self);
		stat.query = query;
		var stat_ref = STAT_GLO_REF();
		stat_ref.subscripts.push('queryStats');
		stat_ref = self.db.cacheConnection.increment(stat_ref);
		//debug('startQueryStat');	debug(stat_ref);
		stat.statId = stat_ref.data;
		stat_ref.subscripts.push(stat.statId);
		stat_ref.data = stat;
		var sc = self.db.cacheConnection.update(stat_ref,'object');
		return stat_ref;
	}
	function stop_query_stats(stat_ref,rowCount) {
		stat_ref.data.rowCount = rowCount;
		stat_ref.data.stop = Date.now();
		stat_ref.data.runtime = (stat_ref.data.stop - stat_ref.data.start);
		var sc = self.db.cacheConnection.update(stat_ref,'object');
	}
	function build_index_glo_ref_from_query(query,callback) {
			var queryKeys = Object.keys(query);
			var index_glo_ref = {};
			var done = false;
			for(var i=0; i<queryKeys.length; i++) {
				if ( done ) { break; }
				// do we have an index for this queryKey
				// ONLY SUPPORTS SIMPLE - 1 level indexes right now...
				// TODO - plug in some kind of optimizer here... like which index is better
				// if there are choices
				for(var j=0; j<self.indexes.length; j++) {
					if ( done ) { break; }
					var indexKeys = Object.keys(self.indexes[j]);
					//debug(indexKeys);
					for(var k=0; k<indexKeys.length; k++) {
						if ( queryKeys[i]===indexKeys[k] ) {
							var index_glo_ref = self.index_glo_ref();
							index_glo_ref.subscripts.push( queryKeys[i] );
							index_glo_ref.subscripts.push( query[queryKeys[i]] ); // push the value we are looking for
							index_glo_ref.subscripts.push(0);
							done = true;
							break;
						}
					}
				}
			}
			//console.dir('build_index_ref');console.dir(callback);console.dir(index_glo_ref);
			if ( gotCallback(callback) ) {
				callback({},index_glo_ref);
			} else {
				return index_glo_ref;
			}
		}
} 
var STAT_GLO_REF = function() {
	return { global : '%globalsjs', subscripts : [] };
}
function QueryStat(collection) {
	var self = this;
	self.collection = collection.name;
	self.start = Date.now();
	self.stop = '';
	self.query = '';
	self.rowCount = 0;
	self.statId = 0;
}
Collection.prototype.findOne = function(query, callback) {
	var self = this;
	if ( gotCallback(callback) ) {
		self.find(query, function(error,result) {
			callback(error, self.first_object(result));
		});
	} else {
		var results = self.find(query);
		//debug(results);
		if ( results.length>0 ) {
			return results[0];
		} else {
			return {};
		}
	}
}

Collection.prototype.find = function(query, callback) {
	// search through for the right rows and return
	var self = this;
	var stat_ref = undefined;
	if ( self.db.recordQueryStats ) {
		stat_ref = self.start_query_stats(query);
	}
	//debug("Collection - find ");
 	var gloRef = {global: self.name, subscripts: []};
	if ( query !== undefined && query.subscripts !== undefined ) {
		gloRef.subscripts = query.subscripts;
	}	
	if ( gotCallback(callback) ) {
		debug('gotCallback!');
		//var gdb = new cache.Cache();
		var gdb = self.db.cacheConnection;
		//gdb.open( self.db.options.___connection, function(error,result) {
			//debug('back from gdb open');
			//debug(error);
			//debug(result);
			//if ( error ) { debug('calling callback');callback(error,result) }
			if ( !isEmptyObject(query) && self.indexes.length>0 ) {
				debug('query not empty',query);
				var idxref = self.build_index_glo_ref_from_query(query);
				debug('async find with query---');
				debug(idxref);
				self.spin_find_index(gdb,idxref,callback);
				debug('aync find() - back from spin_find_index');
				//callback({}, { done : true });
			} else { 		// full table scan
				debug('async full table scan');
				var id_glo_ref = { global : gloRef.global, subscripts : gloRef.subscripts };
				id_glo_ref.subscripts.push(0);
				var spin = true;
				debug(id_glo_ref);
				var ii =0;
				self.spin_find(gdb,id_glo_ref,query,callback);
			}
		//});
	} else {
		var results = [];
		// default will be full 'table scan' - 
		// if we have a query and actually have an index on a property of the query,
		// then we can fetch id's from the index.
		var ids = [];
		if ( query != undefined ) {
			index_gloRef = self.build_index_glo_ref_from_query(query);
			debug(index_gloRef);
			if ( !isEmptyObject(index_gloRef) ) {
				while ( (index_gloRef = self.db.cacheConnection.order(index_gloRef)).result!='') {
					ids.push(index_gloRef.result);
				}
			}
		}
		if ( ids.length == 0 ) {		// did not use an index, full table scan
			// seems as 'list' will only fetch you 1000 records :(
			//ids = self.db.cacheConnection.retrieve(gloRef, 'list');
			var id_glo_ref = { global : gloRef.global, subscripts : gloRef.subscripts };
			id_glo_ref.subscripts.push(0);
			while ( (id_glo_ref = self.db.cacheConnection.order(id_glo_ref)).result!='') {
				//debug(id_glo_ref);
				ids.push(id_glo_ref.result);
			}
		}
		ids.forEach( function(id) {
			gloRef.subscripts = [id];
			var obj = self.db.cacheConnection.retrieve( gloRef, 'object' );
			results.push(obj.object);
		});
		if ( query !== undefined ) {
			var rr = self.filter_results(query, results);		
			if ( stat_ref !== undefined ) {
				self.stop_query_stats(stat_ref,results.length);
			}
			return rr;
		} else {
			if ( stat_ref !== undefined ) {
				self.stop_query_stats(stat_ref,results.length);
			}
			return results;
		}
	}
}
 
Collection.prototype.add = function(object, callback) {
	var self = this;
	// we're going to force a sync operation
	// on getting the next primary key, since the add should
	// fail if we can't	
	var result = self.db.cacheConnection.increment({ global : self.name, subscripts : [], increment : 1});
	//debug('add - increment callback');
	//debug(result);
	if ( result.ok!=1 ) {
		callback(error,result);
		return;
	}
	var id = result.data;
	object.__ID = id;
	var updateCB = function(error,result) {
	  if ( !error ) {
			object.__ID = id;
		}
		callback(error, object);
	}
	var updateArgs =
 		{ node : { global : self.name, subscripts : [object.__ID] },
			object : object
		}
	//debug(updateArgs);
	if ( gotCallback(callback) ) {
		self.db.cacheConnection.update(updateArgs,'object',updateCB);
	} else {
		console.log('-----');
		console.dir(updateArgs);
		return self.db.cacheConnection.update(updateArgs,'object');
	}
}

Collection.prototype.save = function(object, callback) {
	var self = this;
	if ( object.__ID === undefined ) {
		return self.add(object, callback);
	}
	var glo_ref = {};
	glo_ref.node = { global : self.name, subscripts : [object.__ID] };
	glo_ref.object = object;
	if ( gotCallback(callback) ) {
		// for async index maintenance, will need to wrap callback...
		self.db.cacheConnection.update( glo_ref, 'object', callback );
	} else {
		var result = self.db.cacheConnection.update( glo_ref, 'object' );
		if ( result==0 ) {
			//update index
			var operation = self.index_operation.SAVE;
			var idxresult = self.update_index(operation, object);
			return result;
		} else {
			return result;
		}
	}
}

Collection.prototype.remove = function(object, callback) {
	var self = this;
  var	glo_ref = self.fetch_glo_ref_from_object(object);
	//debug(glo_ref);

	if ( gotCallback(callback) ) {
		// wrap callback calls.
		// first, kill data node, then 5gdb(system), then 1gdb(index), then
		// call user callback
		var cbwi = function() {
			self.db.cacheConnection.kill( self.index_glo_ref(), callback );
		};
		var cbws = function(cb) {
			self.db.cacheConnection.kill( self.system_glo_ref(), cbwi );
		};
		self.db.cacheConnection.kill(glo_ref, cbws);
	
	} else {
		//debug('\033[92m');debug(glo_ref);debug('\033[0m');
		var result = self.db.cacheConnection.kill(glo_ref);
		if ( result.ok==1 ) {
			//update index
			var operation = self.index_operation.REMOVE;
			var idxresult = self.update_index(operation, object);
			return result;
		} else {
			return result;
		}

	}
}
Collection.prototype.ensureIndex = function(object, callback) {
	var self = this;
	if ( !callback ) { callback = noop; }
	// and index is just a subscript on a global - 
	// self already knows the global, and the object passed in contains the index information.
	// this function should only see if the index exists, and if so update the "save handler" global - 
	// which will contain info for the CRUD operations.
	// rebuildIndex() does the building...
	self.indexes.push( object );
	Object.keys(object).forEach( function( indexField ) {
		var glo_ref = self.system_glo_ref();
		//debug(glo_ref);
		glo_ref.subscripts.push( 'index', indexField ); 
		glo_ref.data = '';
		//debug(glo_ref);
		var r = self.db.cacheConnection.set( glo_ref);
		//debug(r);
	
	});
	
	//debug('ensureIndex ');debug(self.indexes);
	callback({}, {});

}

Collection.prototype.reIndex = function(callback) {
	var self = this;
	// naive implmentation here...
	var objects = self.find();
	//debug('reIndex--- objects.length='+objects.length);
	objects.forEach( function(o) { self.save(o); } );
}
Collection.prototype.dropIndex = function(object, callback) {
}

function Server(serverConfig, options) {
	//debug('cachedb - Server()');
	this.config = serverConfig;
	this.options = options;
}

inherits(Server, EventEmitter);

Server.prototype.connect = function(dbInstance, options, callback) {
	//debug(callback);
	var self = this;
	//debug('cachedb - Server connect');
	var cacheConnection = new cache.Cache(); 
	process.on('exit', function() {
		debug('Server.connect - process exit event hander');
		debug(cacheConnection);
		try {
			cacheConnection.close();
		} catch(Exception) {
				debug(Exception);
		}
	});		
	if ( gotCallback(callback) ) {
		cacheConnection.open( options.___connection, function(error, result) {
			dbInstance.cacheConnection = cacheConnection;
			callback(error,result);
		});
	} else {
		var r = cacheConnection.open( options.___connection );
		dbInstance.cacheConnection = cacheConnection;
		debug('server.connect dbInstance.cacheConnection',cacheConnection,r);
		return r;
	}
}

// Not sure if need to expose this right now..
// Globals only works 'inprocess', so there is no real concept
// of a connection to a server over a network - the config will always
// just be the path to the Globals install
// Of course, if we have sharding, then we might have some other instances
//exports.Server = Server;


function Db(databaseName, serverConfig, options) {
	var self = this;
	self.server = new Server(serverConfig, options);
	self.databaseName = databaseName;
	self.cacheConnection = {};
	self.init_collections = init_collections;
	self.recordQueryStats = false;
	self.cleanup = cleanup;
	self.process_options = process_options;
	self.process_options(options);
	// wire up exit handler to make sure we clean up!
	process.on('exit', function() {
		debug('caught exit');
		self.cleanup();
	});
	/*
	process.on('uncaughtException', function() {
		debug('caught uncaughtException',arguments);
		console.trace();
		//self.cleanup();
	});
	*/
	function cleanup() {
		debug('cleanup()');
		debug('self.cacheConnection',self.cacheConnection);
		if ( self.server !== undefined ) {
			if ( self.server.cacheConnection !== undefined ) {
				debug('closing cacheConnection');
				self.server.cacheConnection.close();
			}
		}
	}
	function init_collections(options) {
		var self = this;
		// save off options - async requires new connections
		//self.options = options;
		//console.dir(self.options);
		// load up the run-time specified collections
		if ( options.collections !== undefined ) {
			console.log('@@@@@@@@@@@@@@@@@@@@@@');
			console.dir(options);
			console.trace();
			var rtcols = options.collections;
			rtcols.forEach(function(name) {
				self[name] = new Collection(name,self);
			});
		}
		// once we connect - add a property for each global (aka Collection);
		// this is NOT async on purpose, the connection
		// isn't ready for use until it's initialized.
	  var globals = self.cacheConnection.global_directory({});
		globals.forEach(function(name) {  
		  if ( self.name === undefined ) { 		// don't create again.
				if ( Collection.non_system_global(name) ) {
    			self[name] = new Collection(name, self);
				} 
			}
  	});
	}
	/*
	* Available options:
	* recordQueryStats {Boolean, default:false}
	*		Will store query statistics at %globalsdb('queryStats',i)=
	*		{ query : { query object passed in },
				collection : name of the collection,
				start : { Date },
				stop : {Date},
				rowCount : # of rows returned
			}
	*/
	function process_options(options) {
		var self = this;
		if ( options === undefined ) { return; }
		if ( options.recordQueryStats === true ) {
			self.recordQueryStats = true;
		}
	}
}

inherits(Db, EventEmitter);

Db.prototype.createCollection = function(collectionName, options, callback) {
	var self = this;
	var gcb = gotCallback(callback);
	if ( self.collectionName === undefined ) {
		self[collectionName] = new Collection(collectionName, self);
	}
	if ( gcb ) { 
		callback(null, self.collectionName); 
	} else {
		return self.collectionName;
	}
}

Db.prototype.close = function() {
	var self = this;
	if ( self.cacheConnection !== undefined ) {
		self.cacheConnection.close();
	}
}
Db.prototype.connect = function(options, callback) {
	var self = this;
	if ( !options ) {
		options = {};
		//debug(options);
	}	
	// right now, url is just the path to the globalsdb mgr directory
	// user,password and namespace don't seem to matter at all!
	var pathToGlobalsMGR = self.databaseName;		// TO-DO check it's valid
	var userName = "BugsBunny",password = "";
	var namespace = "";
	if ( options.namespace ) { namespace = options.namespace; }
	options['___connection'] = { path : pathToGlobalsMGR, username : userName, password : password, namespace : namespace};
	debug('Db.connection options',options);
	if ( gotCallback(callback) ) {
		self.server.connect(this,options, function(error, result) {	
			if ( !error ) {
				self.init_collections(options);
			}
			callback(error, result);
			});
	} else {
		var r = self.server.connect(this, options);
		debug(r);
		self.init_collections(options);
		return r;
	}
	
}
exports.Db = Db;

