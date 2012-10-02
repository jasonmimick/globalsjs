//#globalsd - network deamon for globalsjs driver
//var crypto = require('crypto');
var util = require('util');
var events = require('events');
//var bson = require('mongodb').pure().BSON;
var cachedb = require('../../globalsjs');
// TODO read from command line
var deamon_opts = {};

function usage() {
	console.log('node globalsd/index.js [options]');
	console.log('Options:');
	console.log('--help');
	console.log('\tPrint this help and exit.');
	console.log('--dbpath <ARG>');
	console.log('\tProvide a path to the running GlobalsDB instance');
	console.log('--port <ARG>');
	console.log('\tProvide a port for client TCP connection to connect on\n\toptional, defaults to 11115');
	console.log('--rest <ARG>');
	console.log('\tEnable web-based admin console and REST apis\n\tARG is optional port to listen on. Default 11125');
}

deamon_opts.GLOBALS_PATH = "/Users/jasonmimick/dev/globalsdb/mgr";
deamon_opts.port = 11115;	// default port
deamon_opts.admin_web_port = 11125;
deamon_opts.enable_admin_web_console = false;
for(var i=2; i<process.argv.length; i++) {
	if ( process.argv[i]=='--help' ) {
		usage();
		process.exit(0);
	}
	if ( process.argv[i]=='--dbpath' ) {
		deamon_opts.GLOBALS_PATH = process.argv[i+1];
	}
	if (process.argv[i]=='--port' ) {
		if ( !isNan( parseInt( process.argv[i+1] ) ) ) {
			deamon_opts.port = parseInt(process.argv[i+1]);
		}
	}
	if ( process.argv[i]=='--rest' ) {
		deamon_opts.enable_admin_web_console = true;
		var wport = parseInt( process.argv[i+1]);
		if ( !isNaN(wport) ) {
			deamon_opts.admin_web_port = wport;
		}
	}
}	
console.log('deamon_opts');console.dir(deamon_opts);
var fs = require('fs');
var http = require('http');
// check dbpath is good-
(function (){
	var path = require('path');
	var cache_binary = path.join(deamon_opts.GLOBALS_PATH,'..','bin','cache');
	try {
		fs.statSync(cache_binary);
	} catch (exception) {
		console.error(deamon_opts.GLOBALS_PATH+' does not appear to be a valid installation of GlobalsDB');
		process.exit(1);
	}
})();

var db = new cachedb.Db(deamon_opts.GLOBALS_PATH);
// optionally specify new run-time collections here when you start the deamon?
var x = db.connect();
var END_OF_MESSAGE = '\n';
var HTTP_HEADERS = {};
HTTP_HEADERS['ok-text'] = { status : 200, content_type : 'text/plain' };
function globalsd(options) {
	var self = this;
	self.opts = options;
	events.EventEmitter.call(this);
	self.start_admin_web_console = function() {
		self.admin_server = http.createServer( function(req,res) {
			var response = self.handle_web_req(req);
			res.writeHead(response.header.status,response.header.content_type);
			res.end(response.body);
		}).listen(self.opts.admin_web_port, 'localhost');
		console.log('admin web console waiting for connections on port '+self.opts.admin_web_port);
	}
	self.handle_web_req = function(req) {
		// if this is a req for some special command e.g. /listCollections
		// forward on, else, dump server info
		
		var res = {};
		res.header = HTTP_HEADERS['ok-text'];
		var html = "<html><head><title>globalds</title>";
		html += '<style type="text/css" media="screen">\n\
body { font-family: helvetica, arial, san-serif }\n\
table { border-collapse:collapse; border-color:#999; margin-top:.5em }\n\
th { background-color:#bbb; color:#000 }\n\
td,th { padding:.25em }\n\
</style>\n';
		html += '</head><body>';
		html += '<h2>globalsd '+	require('os').hostname() + ':' + process.pid + '</h2>';
		html += '<pre>'+db.cacheConnection.version();
		html += deamon_opts.GLOBALS_PATH+'</pre>';
		html += '<hr/>';
		html += '<h3>collections</h3><pre>'+self.collections_html()+'</pre>';
		html += '<hr/>';
		html += self.client_html_table();
		html += '</body>';
		res.body = html;
		return res;
	} 
	self.collections_html = function() {
		//return 'what the heck';
		//return JSON.stringify(db.collection_names,null,'\t');
		return JSON.stringify(db.collection_names);
	}
	self.client_html_table = function() {
		var td = function(c) { return '<td>'+c+'</td>'; }
		var tbl = '<table>\n\
<tr><th>client</th><th>message id</th><th>timestamp</th>\n\
<th>operation</th><th>collection</th><th>parameters</th></tr>\n';
		var client_names = Object.keys(self.clients);
		for(var i=0; i<client_names.length; i++) {
			var client = client_names[i];
			var rs = self.clients[client];
			for(var j=0; j<rs.length; j++) {
				var r = JSON.parse(rs[j]);
				console.dir(r);
				console.dir(r.data);
				tbl += '<tr>'+td(client);
				tbl += td(r.header.id);
				tbl += td(r.header.ts);
				tbl += td(r.data.op);
				tbl += td(r.data.collection);
				tbl += td('<pre>'+JSON.stringify(r.data.params,null,'\t')+'</pre>');
				tbl += '</tr>';			
			}
		}
		tbl += '</table>';
		return tbl;
	}
}
util.inherits(globalsd,events.EventEmitter);
globalsd.prototype.start = 	function() {
		var self = this;
		self.clients = [];
		var net = require('net');
		var buffer = '', startBraceCount = 0, endBraceCount = 0;
		var partial_object = ''; 	// in case of partial object at end of packet
															// prepend to first object of next packet
		self.server = net.createServer(function(c) { //'connection' listener
  		//console.log('server connected');
  		c.on('end', function() {
    		console.log('server - client disconnected');
				// any clean up of this sockets work??
				
				//delete self.clients[c['-~*globalsd-client*~-']];
				console.dir(util.inspect(self.clients,5));
  		});
			c.on('data', function(data) { 
				var object_buffer = [];
			  var json = data.toString('utf8',0);	
				console.dir('data---',json);
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
						console.dir(Exception);
						console.trace();
					}
				}
			});
  		//c.pipe(c);c.write('\r\n');
		});
		process.on('SIGINT', function() {
			console.log('Caught SIGINT - cleaning up');
			try {
				if ( db !== undefined ) { 
					db.close(); 
					console.log('db closed');
				}
				self.server.close();
				if ( self.opts.enable_admin_web_console ) {
					self.admin_server.close();
					console.log('closed admin web console');
				}
			} catch(Exp) { 
				console.dir('SIGINT exception');
				console.trace();console.dir(Exp);console.trace(); 
			}
			debugger;
			console.dir('SIGINT event handler leaving.');
		});
		self.server.on('close', function() {
			console.log('server close event');
			
		});
		self.server.listen(self.opts.port, function() { //'listening' listener
			console.log('a node.js powered network deamon for GlobalsDB');
			console.log('started:' + (new Date).toString() );
			console.log('listening for connections on port:' + self.opts.port);
			console.log('connected to db: '+ db.cacheConnection.version());	
			console.log('globalsdb home='+deamon_opts.GLOBALS_PATH);
			if ( self.opts.enable_admin_web_console ) {
				self.start_admin_web_console();
			}
		});
		
		
}
var INVALID_REQUEST_RESPONSE = '400\n';
function gdb_request_handler(globals_deamon) {
	var self = this;
	self.server = globals_deamon;
	//self.server.on('request', function(req,socket) {
	self.onRequest = function(req,socket) {
		//self.server.removeListener('request',self);
		console.dir('request_handler got request');
		console.dir(req);


		//console.trace();
		// validate req
		if (!valid(req.data) ) { bad_request(socket); return;}
		if ( req.header !== undefined ) {
			if ( req.header.name !== undefined ) {
				if ( globals_deamon.clients[req.header.name]===undefined ) {
					globals_deamon.clients[req.header.name] = [];
				}	
				globals_deamon.clients[req.header.name].push(JSON.stringify(req));
				socket['-~*globalsd-client*~-']=req.header.name;
			}
		}




		var collection = req.data.collection;
		var operation = '';
		var result;
		if ( !collection ) {
			//console.dir('~~~~~~~~~~~~');
			operation = cachedb.Db.prototype[req.data.op];
			//console.dir(operation);
			result = operation.call(db,req.data.params);
			console.dir('~~~~~~~~~');console.dir(req.data.params);
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
			console.dir('~~~~~~~~~');console.dir(req.data.params);
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
                                                              
console.log('\033[92m'+greeting+'\033[0m');
if (typeof argvs[0] =='string' ) {
	var i = parseInt(argvs[0]);
	if ( typeof i == 'number' ) {
		port = i;
	}
}
	process.on('uncaughtException', function() {
		debug('caught uncaughtException',arguments);
		console.trace();
		//self.cleanup();
	});


var gd = new globalsd(deamon_opts);
gd.start();
