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
		self.port = options.port || 111105;
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
	self.datacb = function() {};
	self.default_datacb = function(e,d) { console.log('WARNING: default data callback');console.dir(d); }
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
	self.client = net.connect({port: self.port, host : self.host},
  		function(c) { //'connect' listener
  			//console.log('client connected');
	});
	self.client.on('error', function (error) {
		self.datacb(error);
	});
	var partial_object = '';
	var batch_result_counter = 0;
	var batch_result_size = 0;
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
					batch = [];
				} else {
					batch_result_counter++;
					if ( self.resultMode == self.resultMode_stream ) {	
						//console.log('+++++++++++++++++++++++++++++++++++++++++++++++');
						self.datacb({},o);		// NOTE: we stream back each object as we get it
					} else { // batch mode
						if ( batch_result_counter == batch_result_size ) {
							self.datacb({},batch);
						} else {
							batch.push(o);
						}
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
	self.datacb = self.default_datacb;
	if ( callback !== undefined ) {
		self.datacb = callback;
	}
	msg.header = { id : self.get_id(), name : self.name, ts : Date.now() };
	msg.data = data;
	var json = JSON.stringify(msg);
	self.client.write( json );
	self.client.write(END_OF_MESSAGE);
	//console.log('client wrote');console.dir(json);
} 
	
Client.prototype.global_directory = function(callback) {
	var self = this;
	var request = {};
	request.operation = "global_directory";
	//console.dir('about to send request: ');
	//console.dir(request);
	self.send(request, function (e,r) {
		callback(e,r);
	});
}	
exports.Client = Client;



//dbreq.params = [ { food : 'granola' } ];
//test_client.send( dbreq );
