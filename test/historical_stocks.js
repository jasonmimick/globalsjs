var fs = require('fs');
var datafile = process.argv[2];
var last = "";
var lineCount = 0;
var fields = [ 'Date', 'Ticker', 'Close' ];
var globalsjs = require('../../globalsjs');
console.dir(process.env.GLOBALS_HOME);
var path = process.env.GLOBALS_HOME;
//var path = process.env.GLOBALS_HOME+"/mgr"; //"/Users/jasonmimick/dev/globalsdb/mgr";
if (process.argv[2] !== undefined ) {
	path = process.argv[2];
}
console.log('path='+path);
var db = new globalsjs.Db('globalsdb://localhost:11115',{ resultMode : 'batch' } );
//var db = new globalsjs.Db(path,{ resultMode : 'batch' } );
// async version here - better for remote connections....
//db.connect({ collections : ['HistoricalStockData'] }, function (e,r) {
// sync version here
db.connect( { collections:['HistoricalStockData'] });
console.dir('connected');
var firstChunk = true;
var symbols = [];
process.stdin.on('data', function(chunk) {
	var lines, i;
	lines = (last+chunk).split("\n");
    var mainLoopStart = 0;
    if ( firstChunk ) {
        var header = lines[0].split(',');
        for (i=1; i<header.length;i++) {
            symbols[i]=header[i];
        }
        firstChunk = false;
        mainLoopStart = 1;
    }
    //console.dir(symbols);
    for(i = mainLoopStart; i < lines.length - 1; i++) {
		//console.log("line: (" + (lineCount++) + ")" + lines[i]);
		var parts = lines[i].split(',');
        for(j=1;j<symbols.length;j++) {

		    var stock = {};
            stock.date = parts[0];
            stock.symbol = symbols[j];
            stock.close = parts[j];
		    //console.log( (lineCount++) );
		    db.HistoricalStockData.save( stock, function(err,result) {
		        console.dir(stock);
                console.dir(result);
                console.dir(err);
            });
        }
  }
  last = lines[i];
});
//});

process.stdin.resume();

