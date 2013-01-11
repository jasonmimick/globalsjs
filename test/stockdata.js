var fs = require('fs');
var datafile = process.argv[2];
var last = "";
var lineCount = 0;
var fields = [ 'Date', 'Ticker', 'Open', 'High', 'Low', 'Close', 'Volume' ];
var globalsjs = require('../../globalsjs');
console.dir(process.env.GLOBALS_HOME);
var path = process.env.GLOBALS_HOME;
//var path = process.env.GLOBALS_HOME+"/mgr"; //"/Users/jasonmimick/dev/globalsdb/mgr";
if (process.argv[2] !== undefined ) {
	path = process.argv[2];
}
console.log('path='+path);
//var db = new globalsjs.Db('globalsdb://localhost:11115',{ resultMode : 'batch' } );
var db = new globalsjs.Db(path,{ resultMode : 'batch' } );
//db.connect({ collections : ['stocks'] }, function (e,r) {
db.connect( { collections:['stocks'] });
process.stdin.on('data', function(chunk) {
	var lines, i;
	lines = (last+chunk).split("\n");
  for(i = 0; i < lines.length - 1; i++) {
		//console.log("line: (" + (lineCount++) + ")" + lines[i]);
		var parts = lines[i].split(',');
		var stock = {};
		for(var j=0; j<parts.length; j++) {
			stock[fields[j]]=parts[j];
		}
		console.log( (lineCount++) );
		console.dir(stock);
		db.stocks.save( stock );
  }
  last = lines[i];
});
//});
process.stdin.resume();

