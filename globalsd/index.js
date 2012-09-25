//#globalsd - network deamon for globalsjs driver
//var crypto = require('crypto');
var util = require('util');
var events = require('events');
//var bson = require('mongodb').pure().BSON;
var cachedb = require('../../globalsjs');
// TODO read from command line
var GLOBALS_PATH = "/Users/jasonmimick/dev/globalsdb/mgr";
var db = new cachedb.Db(GLOBALS_PATH);
// optionally specify new run-time collections here when you start the deamon?
var x = db.connect();
var END_OF_MESSAGE = '\n';
function globalsd(options) {
	var self = this;
	var server;
	self.parse_options = parse_options;
	self.opts = parse_options( options );
	// private functions
	function parse_options(o) {
		var oo = {};
		if ( o.port !== undefined ) {
			oo.port = o.port;	// TODO check good number!
		}
		return oo;
	}
	events.EventEmitter.call(this);
}
util.inherits(globalsd,events.EventEmitter);
globalsd.prototype.start = 	function() {
		var self = this;
		var net = require('net');
		var buffer = '', startBraceCount = 0, endBraceCount = 0;
		var partial_object = ''; 	// in case of partial object at end of packet
															// prepend to first object of next packet
		self.server = net.createServer(function(c) { //'connection' listener
  		//console.log('server connected');
  		c.on('end', function() {
    		//console.log('server - client disconnected');
				// any clean up of this sockets work??
  		});
			c.on('data', function(data) { 
				var object_buffer = [];
			  var json = data.toString('utf8',0);	
				var objects = json.split(END_OF_MESSAGE);
				//console.log('server data event');console.dir(objects);
				if ( partial_object.length > 0 ) {
					objects[0]=partial_object + objects[0];
				}
				for(var i=0;i<objects.length;i++) {
					if ( objects[i].length <= 0 ) { continue; }
					try {
						var o = JSON.parse(objects[i]);
						var reqH = new gdb_request_handler(self);
						//self.emit('request',o,c); // was getting funky results
																				// with the event emitter, might
																				// be bug with node 0.6.x I have to use
																				// TODO - refactor to use events so not blocking
						reqH.onRequest(o,c);
						//console.log('why another request???? ---------################');
						//console.dir(objects);
						//console.log('i='+i);
						
						//console.log('################');
						//console.dir(c);
						partial_object = '';		
					} catch(Exception) {
						// if we catch, then we have a partial packet,
						partial_object = objects[i]; 
						//console.log('i='+i+'   '+objects[i]);
						//console.dir(Exception);
						//console.trace();
					}
				}
			});
  		//c.pipe(c);c.write('\r\n');
		});
		process.on('SIGINT', function() {
			//console.log('Caught SIGINT - cleaning up');
			if ( db !== undefined ) { 
				db.close(); 
				//console.log('db closed');
			}
			self.server.close();
		});
		self.server.on('close', function() {
			//console.log('server close event');
			
		});
		self.server.listen(self.opts.port, function() { //'listening' listener
			console.log('a node.js powered network deamon for GlobalsDB');
			console.log('started:' + (new Date).toString() );
			console.log('listening for connections on port:' + self.opts.port);
			console.log('connected to db: '+ db.cacheConnection.version());	
			console.log('globalsdb home='+GLOBALS_PATH);
		});
		
}
var INVALID_REQUEST_RESPONSE = '400\n';
function gdb_request_handler(globals_deamon) {
	var self = this;
	self.server = globals_deamon;
	//self.server.on('request', function(req,socket) {
	self.onRequest = function(req,socket) {
		//self.server.removeListener('request',self);
		//console.dir('request_handler got request');
		//console.dir(req);
		//console.trace();
		// validate req
		if (!valid(req.data) ) { bad_request(socket); return;}
		var collection = req.data.collection;
		var operation = '';
		var result;
		if ( !collection ) {
			//console.dir('~~~~~~~~~~~~');
			operation = cachedb.Db.prototype[req.data.op];
			//console.dir(operation);
			result = operation.call(db,req.data.params);
			//console.dir('#######################');console.dir(result);
		} else {
			//console.dir('~~~~~~~~~~~~');
			operation = cachedb.Collection.prototype[req.data.op];
			//console.dir('~~~~~~~~~~~~');
			if ( operation === undefined ) {
				bad_request(socket);
				console.log('400');console.log(req);
				return;
			};
	
			result = operation.call(db[collection],req.data.params);
		}
		//console.log('---->operation=');console.dir(operation.toString());
		//console.log('db['+collection+']');console.dir(db[collection]);
	
		//console.log(result);
		//console.log('those were the results');
		// send header packet - with meta data about results.
		var ackProp = '~*-globalsdb-*~';
		var header = {};
		header[ackProp] = {id : req.header.id};
		if ( result.forEach !== undefined ) { 		// we have an array of results
			header[ackProp]['result_count']=result.length;
			socket.write(JSON.stringify(header));
			socket.write('\n');
			result.forEach( function(r) { 
				socket.write(JSON.stringify(r)); 
				socket.write('\n');	//end of object
			} );
		} else {
			header[ackProp]['result_count']=1;
			socket.write(JSON.stringify(header));
			socket.write('\n');
			socket.write(JSON.stringify( result  ) );
			socket.write('\n');
		}
		//console.log('###########');
		// DO I WANT TO END HERE???
		//socket.end();
		//socket.write('\n');
		
	}//);
	function bad_request(s) {
		s.write(INVALID_REQUEST_RESPONSE);
	}
	function valid(r) {
		if (r.op === undefined )  {
			console.log('INVALID REQUEST');console.dir(r);
			return false;
		}
		console.log('____ VALID REQUEST');console.dir(r);
		return true;
	} 
}

exports.globalsd = globalsd;	
var argvs = process.argv.splice(2);
var greeting = '\
  ______         _____  ______  _______        _______ ______ \n\
 |  ____ |      |     | |_____] |_____| |      |______ |     \\\n\
 |_____| |_____ |_____| |_____] |     | |_____ ______| |_____/';
                                                              
console.log(greeting);
var port = 111105;	// default port
if (typeof argvs[0] =='string' ) {
	var i = parseInt(argvs[0]);
	if ( typeof i == 'number' ) {
		port = i;
	}
}

var gd = new globalsd({'port':port});
gd.start();
