var rootOfGlobalsInstall = process.env.GLOBALS_HOME;
var rootOfNodeInstall = process.env.nodeRoot;
var fullPathToCacheDotNode = '' ;

// --- Connection Information ---

var pathToGlobalsMGR = rootOfGlobalsInstall + '/mgr';
var userName = '_SYSTEM';
var password = 'SYS';
var namespace = 'fooUSER';

// --- First load the 'cache.node' module to interface the Globals Database ---

var globals = require(fullPathToCacheDotNode + 'cache');

// --- Create an instance of the Globals Cache object ---

var myData = new globals.Cache();
console.log(myData);
var appdata = "data--"+(new Date());
console.log(appdata);
myData.open(pathToGlobalsMGR, userName, password, namespace);
myData.set( { global: 'foo.bar', subscripts: [1],data : appdata}, function(err,result) {
	if ( err ) {
		console.log('error');
	}
	console.log(JSON.stringify(result));
 
});
