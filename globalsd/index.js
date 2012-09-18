//#globalsd - network deamon for globalsjs driver
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
}
globalsd.prototype.start = 	function() {
		var self = this;
		var net = require('net');
		self.server = net.createServer(function(c) { //'connection' listener
  		console.log('server connected');
  		c.on('end', function() {
    		console.log('server disconnected');
  		});
			c.on('data', function(d) { console.log('got:'+d); });
  		c.write('hello\r\n');
  		c.pipe(c);
		});
		self.server.listen(self.opts.port, function() { //'listening' listener
  		console.log('server bound');
		});
}
exports.globalsd = globalsd;	
var gd = new globalsd({port:12101});
gd.start();
