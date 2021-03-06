/*
 * globalsjs api
 *
 */
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
		util = require('util'),
		fs = require('fs'),
		url = require('url');
var globalsd_client = require('./globalsd/lib/client.js');
var query_processor = require('./query.js');
var noop = function() {};
var isEmptyObject = function(o) {
		for(var x in o) { return false; }  // this is how jQuery checks 'isEmptyObject'
		return true;
}
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
Each collection(global) will have two auxilliary globals - one for indexes, one for system
stats - a collection called 'foo' (^foo) would have indexes in 'foo1gdb' and meta-data in 
'foo5gdb' - the 1 stands for 1ndex, the 5 for 5ystem.
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
    self.drop_collection = drop_collection;
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
			} else { 
				console.log('ran off end?');console.dir(resultXX);
				return;
			} 	
		});
	}
	function spin_find_index(gdb,glo_ref,callback) {
		debug('spin_find_index() glo_ref',glo_ref);
		gdb.order(glo_ref, function(error,resultXX) {
			if ( error ) { 
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
				debug('async scan order spin', gr, gri);
				gdb.retrieve( gr, 'object', function(error,result) {
					callback(error,result.object);  // send results to caller
					self.spin_find_index(gdb,gri,callback); // find more
				});
			} else { // we're done, close the connection
				//try {
				gdb.close();
				//} catch(exp) { console.dir(exp); }
			console.dir('leaving SIGIN');
			} 	
		});
	}
	function load_indexes() {
		if ( self.db.isRemoteConnection ) {
			debug('load_indexes() - connection was remote, nothing to do');
			return;
		}
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
			debug(glo_ref);
			if ( operation == self.index_operation.REMOVE ) {
					var sc = self.db.cacheConnection.kill(glo_ref);
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
			// TODO what if another process adds an index - how will we know???
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
        /* this is original simple query processing 
		for(var i=0; i<results.length; i++) {
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
        end simple original query processing */
        // New query processor
        var qp = new query_processor.Query(query);
        filtered = qp.execute(results);
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
		debug('fetch_glo_ref_from_object');debug(glo_ref);
		return glo_ref;
	}

    function drop_collection(callback) {
        if ( gotCallback(callback) ) {
            self.db.cacheConnection.kill(self.name,callback);
        } else {
            return self.db.cacheConnection.kill(self.name);
        }
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
			if ( gotCallback(callback) ) {
				callback({},index_glo_ref);
			} else {
				return index_glo_ref;
			}
		}
		/*
		function remote(operation, params, callback) {
			var dbreq = {};
			dbreq.op = operation;
			dbreq.params = [];
			if ( params instanceof Array ) {
				dbreq.params = params;
			} else {
				dbreq.params.push(params);
			}
			if ( !gotCallback(callback) ) {
				console.warn("sync not implementd for remote yet!");
			}
			self.db.remoteClient.send(dbreq,function(error,result) {
				console.log('Collection remote - ');
				console.dir(result);
				callback(result);
			});
		}
		*/
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
Collection.prototype.count = function(callback) {
	var self = this;
	// TODO check if remote connection
 	var gloRef = {global: self.name, subscripts: []};
	if ( gotCallback(callback) ) {
		self.db.cacheConnection.get(gloRef, function(e,r) {
			var count = NaN;  // should this be 0?
			if ( r.data !== undefined ) {
				count = r.data;
			}
			callback(e,count);
		});
	} else {
		var count = self.db.cacheConnection.get(gloRef);
		return count.data ? count.data : 0;
	}
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
    //console.log('Collection.prototype.find --> query=');console.dir(query);
	//console.log(query instanceof Array); 
	if ( query instanceof Array ) {
		query = query.pop();
	}
	// if remote, forward to tcp-client-
	if ( self.db.isRemoteConnection ) {
		var req = {};
		req.op = 'find';
		req.collection = self.name;
		req.params = [];
		req.params.push(query);
		debug(req);		
		if ( gotCallback(callback) ) {
			self.db.remote_client.send(req,callback);
			return;
		} else { 
			return self.db.remote_client.send(req);		
		}
	}
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
		var gdb = self.db.cacheConnection;
		if ( !isEmptyObject(query) && self.indexes.length>0 ) {
			debug('query not empty',query);
			var idxref = self.build_index_glo_ref_from_query(query);
			debug('async find with query---');
			debug(idxref);
			self.spin_find_index(gdb,idxref,callback);
			debug('aync find() - back from spin_find_index');
		} else { 		// full table scan
			debug('async full table scan');
			var id_glo_ref = { global : gloRef.global, subscripts : gloRef.subscripts };
			id_glo_ref.subscripts.push(0);
			var spin = true;
			debug(id_glo_ref);
			var ii =0;
			self.spin_find(gdb,id_glo_ref,query,callback);
		}
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
		//console.dir(ids);
		ids.forEach( function(id) {
			gloRef.subscripts = [id];
			var obj = self.db.cacheConnection.retrieve( gloRef, 'object' );
			results.push(obj.object);
		});
		if ( !isEmptyObject(query) ) {
			debug('results.length='+results.length);
			var rr = self.filter_results(query, results);		
			if ( stat_ref !== undefined ) {
				self.stop_query_stats(stat_ref,results.length);
			}
			return rr;
		} else {
			if ( stat_ref !== undefined ) {
				self.stop_query_stats(stat_ref,results.length);
			}
			debug('about to return ' + results.length + ' results...');
			return results;
		}
	}
}
 
Collection.prototype.add = function(object, callback) {
	var self = this;
    //console.log('Collection.add >>>>>>>>>>>');
    //console.dir(self.db);
	if ( self.db && self.db.isRemoteConnection ) {
		var req = {};
		req.op = 'add';
		req.collection = self.name;
		req.params = [];
		req.params.push(object);
		debug(req);		
		if ( gotCallback(callback) ) {
			self.db.remote_client.send(req,callback);
			return;
		} else { 
			return self.db.remote_client.send(req);		
		}
	}


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
	var updateArgs =
 		{ node : { global : self.name, subscripts : [object.__ID] },
			object : object
		}
	var updateCB = function(error,result) {
	  if ( !error ) {
			object.__ID = id;
		}
		var result = self.update_index(self.index_operation.SAVE, updateArgs.object);
		callback(error, object);
	}
    //debug(updateArgs);
	if ( gotCallback(callback) ) {
		self.db.cacheConnection.update(updateArgs,'object',updateCB);
	} else {
		var update_result = self.db.cacheConnection.update(updateArgs,'object');
        if ( update_result==0 ) {
	        return result = self.update_index(self.index_operation.SAVE, updateArgs.object);
        } else {
            return update_result;
        }

	}
}

Collection.prototype.save = function(object, callback) {
	var self = this;
	if ( object instanceof Array ) {
		object = object.pop();
		//console.dir(object);console.dir('that was popped');
	}
	
	if ( isEmptyObject( object ) ) {
		var error = {error: 'save object was empty'};
		if ( gotCallback(callback) ) {
			callback(error,{});
		} else {
			return error;
		}
	}
	if ( object.__ID === undefined ) {
		return self.add(object, callback);
	}
	
	if ( self.db.isRemoteConnection ) {
        console.dir("Collection.save - remote connection");
		var req = {};
		req.op = 'save';
		req.collection = self.name;
		req.params = [];
		req.params.push(object);
		debug(req);		
		if ( gotCallback(callback) ) {
			self.db.remote_client.send(req,callback);
			return;
		} else { 
			return self.db.remote_client.send(req);		
		}
	}
	var glo_ref = {};
	glo_ref.node = { global : self.name, subscripts : [object.__ID] };
	glo_ref.object = object;
	if ( gotCallback(callback) ) {
		// for async index maintenance, will need to wrap callback...
		//console.dir(glo_ref);
		self.db.cacheConnection.update( glo_ref, 'object', function(e,o) {
			var result = self.update_index(self.index_operation.SAVE, object);
			callback(e,result);
		} );
	} else {
		var result = self.db.cacheConnection.update( glo_ref, 'object' );
		//console.dir('save - update result: ');console.dir(result);
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
    if ( object instanceof Array ) {
		object = object.pop();
		//console.dir(object);console.dir('that was popped');
	}

	if ( self.db.isRemoteConnection ) {
		console.log('~~~~~ Collection.remove --->');console.dir(object);
		var req = {};
		req.op = 'remove';
		req.collection = self.name;
		req.params = [];
		req.params.push(object);
		debug(req);		
		if ( gotCallback(callback) ) {
			self.db.remote_client.send(req,callback);
			return;
		} else { 
			return self.db.remote_client.send(req);		
		}
	}
   if ( !object ) {
        debug('remove called with no object - removing all!');
        self.drop_collection(callback);
        return;
    }
		debug('Collection.remove()  - object->');debug(object);
  var	glo_ref = self.fetch_glo_ref_from_object(object);
	debug(glo_ref);
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
// ensureSQL will enable SQL access to this collection.
// You should call this with a prototypical object of you collection
// Then, the object will be inspected and a corresponding Caché class
// will get generated for SQL access.
// If you collection contains object with different properties, then you
// can also pass in an array for the object parameter, and we will
// take the union of all fields. 
// Datatypes supported are just String and Integer, you can override
// (with Caché datatypes) in the optional meta parameter.
// Options in the meta parameter
// meta = {
//  package : <package_name> (default: gdb)
//  classname : <class_name> (default: collection name)
//  properties : [ { name : <property_name>, type : <Caché_datatype> }, ... ]
//  }
//
Collection.prototype.ensureSQL = function(object, meta, callback) {
    var self = this;
    if (self.isRemoteConnection ) {
        return;
    }
    // check args
    if ( arguments.length == 3 ) { // got meta
        // good to go
    } else if ( arguments.length == 2 ) {
        if ( Object.prototype.toString.call(meta) == "[object Function]" ) {
            // 2nd parameter was a function -> it's the callback
            var callback = meta; 
        } else { // no callback
            var callback = noop;
        }
    } else if ( arguments.length == 1 ) {
        var meta = {};  // default are setup below
        var callback = noop;
    } else { // got no args!
     debug('ensureSQL() on ' + self.name + ' called with no arguments. ');
     return;
    }
    // check meta is good
    //debugger;
    if ( meta.package == undefined ) {
        meta.package = 'gdb'; //default
    }
    if ( meta.classname == undefined ) {
        meta.classname = self.name; //default
    }
    if ( meta.properties == undefined ) {
        meta.properties = [];
        for (var prop in object) {
            var m = {};
            m.name = prop;
            m.type = "%Library.String";
            if ( typeof object[prop]==='number' ) { 
                if ( object[prop]==Math.round(object[prop]) ) {
                    m.type = "%Library.Integer";
                } else {
                    m.type = "%Library.Double";
                }
            }
            meta.properties.push(m);
        }
    }
    meta.indicies = [];
    debug(self.indexes);
    for (var i=0; i<self.indexes.length; i++) {
        var prop_name = Object.keys(self.indexes[i])[0]; // only one property
        meta.indicies.push( { name : prop_name, value : self.indexes[i][prop_name] } );
        //debug('Index - ensureSQL idx=');
        //debug(self.indexes[i]);
        //debug("finish this!!");
    }
    // build glo_ref for class generator deamon
    //debugger;
    var transaction_id = self.db.cacheConnection.increment('globalsjs.sql','in',1);
    debug("ensureSQL transaction_id="+transaction_id);
    var glo_ref = {};
    glo_ref.global = 'globalsjs.sql';
    glo_ref.subscripts = [];
    glo_ref.subscripts.push('in');
    glo_ref.subscripts.push(transaction_id);
    glo_ref.subscripts.push('classname');
    glo_ref.data = meta.package + '.' + meta.classname;
    debug(glo_ref);
    var result=self.db.cacheConnection.set( glo_ref );
    debug(result);
    glo_ref.subscripts.pop();
    glo_ref.subscripts.push('globalname');
    glo_ref.data = meta.classname;
    debug(glo_ref);
    result=self.db.cacheConnection.set( glo_ref );
    debug(result);
    glo_ref.subscripts.pop();
    glo_ref.subscripts.push('properties');
    for(var i=0; i<meta.properties.length; i++) {
        glo_ref.subscripts.push(meta.properties[i].name);
        glo_ref.data = meta.properties[i].type;
        result=self.db.cacheConnection.set( glo_ref );
        debug(result);
        glo_ref.subscripts.pop();
    }
    glo_ref.subscripts.pop();   // pop off 'properties'
    glo_ref.subscripts.push('indicies');
    for(var i=0; i<meta.indicies.length; i++) {
        glo_ref.subscripts.push( meta.indicies[i].name );
        glo_ref.data = meta.indicies[i].value;
        result=self.db.cacheConnection.set( glo_ref );
        debug(result);
        glo_ref.subscripts.pop();
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
    //
    // Make sure we don't already have an index on this property
    var index_exists = false;
    for(var i=0; i<self.indexes.length; i++) {
        Object.keys(self.indexes[i]).forEach( function(index_field) {
            Object.keys(object).forEach( function(object_field) {
                if ( object_field==index_field ) {
                    self.indexes[i][index_field]=object[object_field]; // copy collation order
                    // we already got this index.
                    index_exists = true;
                }
            });
        });
    }
    if ( index_exists ) { callback(); return; }
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
	// TODO--- this does not scale at all!!!! - refactor......
//	var objects = self.find();
	//debug('reIndex--- objects.length='+objects.length);
//	objects.forEach( function(o) { self.save(o,callback); } );
    if ( gotCallback(callback) ) {
	    self.find({}, function(e,o ) {
            console.log('reIndex---callback');console.dir(o);
		    var result = self.update_index(self.index_operation.SAVE, o);
		    //self.save(o,callback); 
		    callback({},result);
	    });
    } else {
        //debugger;
        var us = self.find();
        for(var i=0; i<us.length; i++) {
            var r = self.update_index(self.index_operation.SAVE, us[i]);
        }
    }
}
Collection.prototype.dropIndex = function(object, callback) {
}


// TODO don't think we need this 'Server' object, it's not really
// doing anything
function Server(serverConfig, options) {
	//debug('cachedb - Server()');
	this.config = serverConfig;
	this.options = options;
}

inherits(Server, EventEmitter);

Server.prototype.connect = function(dbInstance, options, callback) {
	var self = this;
	var cacheConnection = new cache.Cache(); 
	if ( gotCallback(callback) ) {
		/**/
        options.___connection.nspace = options.___connection.namespace;
        debugger;
        cacheConnection.open( options.___connection, function(error, result) {
                //debugger;
                if ( error ) { callback(error,result); }
			    dbInstance.cacheConnection = cacheConnection;
			    // ensure we're in the namespace asked for - 
                if (cacheConnection.function("$$Access^%NSP",options.namespace)!=1) {
                     error = {};
                     error.Message = "Unable to change to namespace='"+options.namespace+"'";
                }
                callback(error,result);
		    });
        } else {
            try {
		        var r = cacheConnection.open( options.___connection );
		        dbInstance.cacheConnection = cacheConnection;
		        // ensure we're in the namespace asked for - 
                if (cacheConnection.function("$$Access^%NSP",options.namespace)!=1) {
                     error = {};
                     error.Message = "Unable to change to namespace='"+options.namespace+"'";
                     return error;
                }
                debug('server.connect dbInstance.cacheConnection',cacheConnection,r);
		        return r;
            } catch (error) { throw error; }
	}
}
function Db(databaseName, options) {
	var self = this;
	self.collection_names = [];
	self.server = new Server(options);
	self.const_options = options;
	self.databaseName = databaseName;
	if ( (databaseName === undefined ) || (databaseName.length==0) ) {
		if ( process.env.GLOBALS_HOME !== undefined ) {
			self.databaseName = require('path').join(process.env.GLOBALS_HOME,'mgr');
		}
	}
	self.cacheConnection = {};
	self.isRemoteConnection = false;
	self.init_remote_connection = init_remote_connection;
	self.init_collections = init_collections;
	self.recordQueryStats = false;
	self.cleanup = cleanup;
	self.remote_client = {};
	self.process_options = process_options;
	self.process_options(options);
	// wire up exit handler to make sure we clean up!
	process.on('exit', function() {
		debug('caught exit');
		self.cleanup();
	});
	
	process.on('uncaughtException', function() {
		console.log('caught uncaughtException');console.dir(arguments);
		console.trace();
		self.cleanup();
	});

	function init_remote_connection(url) {
		var options = get_options_from_url(url);
		if ( self.const_options && self.const_options.resultMode !== undefined ) {
			options.resultMode = self.const_options.resultMode;
		}
		self.remote_client = new globalsd_client.Client(options);	
		self.remote_client.connect();
	}
	function get_options_from_url(c) {	
		var opts = {};
		var purl = url.parse(c);
		if ( purl.hostname !== undefined ) {
			opts.host = purl.hostname;
		} else {
			opts.host = 'localhost';
		} 
		if ( purl.port !== undefined ) {
			opts.port = purl.port;	
		}
		return opts;
	}
	function cleanup() {
		debug('cleanup()');
		debug('self.cacheConnection',self.cacheConnection);
		if ( self.server !== undefined ) {
			if ( !isEmptyObject(self.server.cacheConnection) ) {
				debug('closing cacheConnection');
				self.server.cacheConnection.close();
			}
		}
	}
	function init_collections(options) {
		var self = this;
		if ( options.collections !== undefined ) {
			var rtcols = options.collections;
			rtcols.forEach(function(name) {
				self[name] = new Collection(name,self);
				try{
					self.collection_names.push(name);
				} catch(erere) { console.log(erere);console.trace(); }
			});
		}
		var globals = [];
        // DO NOT - automatically try to fetch global_directory
        //debugger;
		if ( self.isRemoteConnection ) {
			self.remote_client.global_directory(function(e,glos) {
			console.log('remote_client global_directory callback');
			console.dir(glos);
            console.dir(e);
			var keys = Object.keys(glos);
			for(var i=0; i<keys.length; i++) {
				var key = keys[i];  
				var name = glos[key];
		  	    if ( self.name === undefined ) { 		// don't create again.
					if ( Collection.non_system_global(name) ) {
    				self[name] = new Collection(name, self);
						self.collection_names.push(name);
						//console.dir(self.collection_names);
					} 
				}
			}
			});
		} else {
			// once we connect - add a property for each global (aka Collection);
			// this is NOT async on purpose, the connection
			// isn't ready for use until it's initialized.
	  	    globals = self.cacheConnection.global_directory({});
            //debug('NOT adding collection for each existing global!!!!!!');
            // The problem here is that if you connect up to a
            // namespace which has other Caché stuff - like regular 
            // persistent Caché classes, then those globals would load
            // but they do not follow the storage strategy of globalsdb,
            // thus things get messed up.
            // For now - you need to explicitly call out the collections
            // you want to access
            // TODO: add some meta data about the 'globalsjs' collections
            // TODO TODO: get the cache.node to store data using the right strategy
            // so that anything you create here is automatically kosher with everything
            // else in Caché.
            //debug(globals);
            //globals = [];
			globals.forEach(function(name) {  
		  	if ( self.name === undefined ) { 		// don't create again.
					if ( Collection.non_system_global(name) ) {
    				self[name] = new Collection(name, self);
						self.collection_names.push(name);
					} 
				}
  		    });
		    /** experimental - for any of our collections, which are not
            in ^globalsjs("collections",<collection_name>) we want to write
            a reminder so that when we save objects into the collection, we can update
            the ^globalsjs.sql("in" node for the class generator deamon to pick
            up and generate the classes for SQL access to the collection.
            Only do this if the deamon is running??? 
            Check - ^globalsjs.sql("control","enabled") exists. (enabled just means
            that the sql-code-gen is turned on, we don't actually need the deamon
            to by running, you could do that later.
            This only really makes sense for local connections - the tcp
            connections will eventually go over the wire and land up here anyway.
            **/
            //debugger;
            var sqldon = self.cacheConnection.get('globalsjs.sql','control','enabled');
            debug('sqldon='+sqldon);
            //console.dir('---------------');
            //console.dir(self.cacheConnection);
            //console.dir('---------------');
        }
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
Db.prototype.collections = function() {
	var self = this;
	var props = Object.keys(self);
	var collections = [];
	for(var i=0; i<props.length; i++) {
		var prop = props[i];
		if ( self[prop] instanceof Collection ) {
			collections.push(prop);
		}
	}
	return collections;
}
Db.prototype.global_directory = function() {
	var self = this;
	var globals = self.cacheConnection.global_directory({});
	//console.log('Db.global_directory');console.dir(globals);
	var good_globals = {};
	var i=0;
	globals.forEach(function(name) {  
		if ( Collection.non_system_global(name) ) {
			good_globals[++i]=name;
		}
	});
	return good_globals;
} 

Db.prototype.createCollection = function(collectionName, options, callback) {
	var self = this;
	var gcb = gotCallback(callback);
	if ( self.collectionName === undefined ) {
		self[collectionName] = new Collection(collectionName, self);
		self.collection_names.push(collectionName);
	}
	if ( gcb ) { 
		callback(null, self.collectionName); 
	} else {
		return self.collectionName;
	}
}

Db.prototype.close = function() {
	var self = this;
	//console.dir('Db.close() self.isRemoteConnection='+self.isRemoteConnection);
	//console.dir('Db.close() self.cacheConnection');	console.dir(self.cacheConnection);
	if ( !isEmptyObject(self.cacheConnection) ) {
		try {
		self.cacheConnection.close();
		} catch(eeee) { debug(eeee); }
	}
	if ( self.isRemoteConnection ) {
		try {
		self.remote_client.close();
		} catch(eee) { debug(eee); }
	}
}
function isRemoteDB(connstr) {
	// if the connstr looks to be a path (valid) on the local system,
	// then we will assume this is a local connection
	// otherwise, assume remote
	try {
		fs.statSync(connstr);
		//console.dir('isRemoteDB - false' + connstr);
		return false;
	} catch (e) {
	}
	//console.dir('isRemoteDB - true' + connstr);	
	return true;

}
Db.prototype.connect = function(options, callback) {
    debugger;
	var self = this;
	if ( !options ) {
		options = {};
	}	
	// right now, url is just the path to the globalsdb mgr directory
	// user,password and namespace don't seem to matter at all!
	var pathToGlobalsMGR = self.databaseName;		// TODO check it's valid
    //console.log('about to check remote');
	if ( isRemoteDB( pathToGlobalsMGR ) ) {
		self.isRemoteConnection = true;
		self.init_remote_connection( pathToGlobalsMGR, callback );
		self.init_collections(options);
            console.log('init_collections after');
		if ( gotCallback(callback) ) {
			callback({},{OK:1});
		}
		return;
	}
	//var userName = "BugsBunny",password = "";
	var userName = "_SYSTEM",password = "SYS";
	var namespace = "SAMPLES";
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
Db.prototype.namespace = function(new_namespace) {
    var self = this;
    if ( new_namespace ) {
        self.cacheConnection.function("$$Access^%NSP",new_namespace);
    }
    return self.cacheConnection.function("DEFDIR^%SYS.GLO");
}
Db.prototype.function = function(parameters, callback) {
    var self = this;
    if ( typeof arguments[0] == 'object' ) {
        debugger;
        var o = arguments[0];
        if ( o.function.indexOf('^')==-1 ) {    // convert class.method calls
            console.dir(o);
            var fn = o.function.split('.');
            o.function = "$$cw^gu";
            var args = [];
            args.push( fn.slice(0,fn.length-1).join('.') );
            args.push( fn[fn.length-1] );
            for (var i=0; i<o.arguments.length; i++) {
                args.push(o.arguments[i]);
            }
            o.arguments = args;
            arguments[0] = o;
        }
    }
    return self.cacheConnection.function.apply(self.cacheConnection,arguments);

}
exports.Db = Db;

// only export if unit test ???
exports.Collection = Collection;

