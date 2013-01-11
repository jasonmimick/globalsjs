var net = require('net');
var crypto = require('crypto');
var bson = require('mongodb').pure().BSON;
var END_OF_MESSAGE = '\n';
var ackProp = '~*-globalsdb-*~';
function Client(options) {
	var self = this;
	// opts = { resultMode : 'batch' }
	self.resultMode_batch = 'batch';
	self.resultMode_stream = 'stream'
	self.resultMode = self.resultMode_batch; // default is to batch...
	if ( typeof options === 'object' ) {
		self.port = options.port || 11115;
		self.host = options.host || 'localhost';
		self.name = options.name || require('os').hostname() + ':' + process.pid;
		if ( options.resultMode ) {
			if ( (options.resultMode !== self.resultMode_batch) &&
					 (options.resultMode !== self.resultMode_stream) ) {
				console.log('Invalid resultMode detected \''+options.resultMode+'\' defaulting to \'batch\' mode');
			} else { 
				self.resultMode = options.resultMode;
			}
		}
		//console.log('client() - got options');console.dir(self);
	} else {
		self.port = 12101;
		self.host = 'localhost';
		self.name = require('os').hostname() + ':' + process.pid;
	}
	var id = 0;
	self.get_id = function() {
		return id++;
	}
	self.client = {};
	//dataCallbacks maps server requests to callbacks
	//each request gets wrapped in a header with an id
	//when data is sent back, the header is parsed and 
	//data is sent back to the correct callback according 
	//to the msg id in the header.
	self.dataCallbacks = {};	// msg.id => callback
	self.default_datacb = function(e,d) { 
		console.log('WARNING: default data callback');
		console.dir(d); 
	}
	self.isACKObject = function(obj) {
		if ( obj[ackProp] !== undefined ) { return true; }
		return false;
	}
}
Client.prototype.connect = function(options) {
	var self = this;
	if ( options !== undefined ) {
		// able to inject more options
		//console.log('server data event');	
	}
    console.log("client connect");console.dir(self);
	self.client = net.connect({port: self.port, host : self.host},
  		function(c) { //'connect' listener
  			console.log('client connected');
	});
    self.client.on('connect', function() {
        console.dir('client.connect ==');
    });
	self.client.on('error', function (error) {
		//self.datacb(error);
        console.dir("error-------------- client.on");
		console.error(error);
        console.trace();
	});
	var partial_object = '';
	var batch_result_counter = 0;
	var batch_result_size = 0;
	var current_result_msg_id = '';
	var batch = [];
	self.client.on('data', function(data) {
		//console.dir('data event - data='+data);
 		var objects = data.toString().split('\n');
		if ( partial_object.length>0 ) {
			objects[0] = partial_object + objects[0];
		};
		for(var i=0; i<objects.length; i++) {
			if ( objects[i].length <= 0 ) {
				continue;
			}
			try {
				var o = JSON.parse(objects[i]);
				//console.log('got object back from server ~~~~~~~~~~~');
				//console.dir(o);
				//console.dir(self.datacb);
				//console.log('~~~~~~~~~~~~~~~~~~~');
				if ( self.isACKObject(o) ) {
					batch_result_size = o[ackProp]['result_count'];
								batch_result_counter = 0;		// reset - got new ack
					current_result_msg_id = o[ackProp]['id'];
					//console.dir('------------>current__result_msg_id='+current_result_msg_id);
					if ( batch_result_size === 0 ) {
						self.dataCallbacks[current_result_msg_id]({count:0},[]);
					}
					batch = [];
				} else {
					batch_result_counter++;
					if ( self.resultMode == self.resultMode_stream ) {	
						//console.log('+++++++++++++++++++++++++++++++++++++++++++++++');
						//self.datacb({},o);		// NOTE: we stream back each object as we get it
						// lookup the callback.
						self.dataCallbacks[current_result_msg_id]({},o);
					} else { // batch mode
						batch.push(o);
						if ( batch_result_counter == batch_result_size ) {
							//console.log('calling datacb' + self.dataCallbacks[current_result_msg_id].toString());
							self.dataCallbacks[current_result_msg_id]({},batch);
							//self.datacb({},batch);
						} else {
							//batch.push(o);
						}
						//batch_result_counter++;
					}
				}
				partial_object = '';
			} catch (error) {
				partial_object = objects[i];
			}
		}	
	});
	self.client.on('end', function() {
  	//console.log('client disconnected');
	});
}
Client.prototype.close = function() {
	var self = this;
	//console.dir('client - close ' + self.client);
	//console.trace();
	if ( self.client !== undefined ) {
		//console.log('client - close - calling end()');
		self.client.end();
	}
}

Client.prototype.send = function(data,callback) {
	var self = this;
	var msg = {};
	//self.datacb = self.default_datacb;
	//console.log('client.send ---' + callback.toString());
	if ( callback === undefined ) {
		//self.datacb = callback;
		callback = self.default_datacb;		// how to make sync?
	}
	msg.header = { id : self.get_id(), name : self.name, ts : (new Date()) };
	msg.data = data;
	self.dataCallbacks[msg.header.id]=callback;
	//console.log('%%%%%%%%%%%%%%%%%%%%%%%');
	//console.dir(self.dataCallbacks);
	var json = JSON.stringify(msg);
	self.client.write( json );
	self.client.write(END_OF_MESSAGE);
	//console.log('client wrote');console.dir(json);
} 
	
Client.prototype.global_directory = function(callback) {
	var self = this;
	var request = {};
	request.op = "global_directory";
	request.params = [];
	//console.dir('client global_dir: ');
	//console.trace();
	//console.dir(request);
	self.send(request, function (e,r) {
		//console.dir('client global_dir callback');console.dir(r);
		callback(e,r.pop());
	});
}	
exports.Client = Client;
