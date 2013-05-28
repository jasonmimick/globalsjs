var cache = require('cache');
var options = {
    path : "/Users/jmimick/caches/blue/mgr",
    username : "_SYSTEM",
    password : "SYS",
    namespace : "LUMERIS" }

var db = new cache.Cache();
console.dir(options);
/*
db.open( options, function(error, result) {
    if ( error ) { console.dir(error); return; }
    console.dir(result);

    var dir = db.function("DEFDIR^%SYS.GLO");
    console.log("async --->$$DEFDIR^%SYS.GLO()="+dir);
});
*/
console.log('-------- try 2 -------');
var db2 = new cache.Cache();
try {
    db.open(options.path,options.username,options.password,"SAMPLES");
    var dir = db.function("DEFDIR^%SYS.GLO");
    console.log("$$DEFDIR^%SYS.GLO()="+dir);
    dir = db.function("$$Access^%NSP",options.namespace);
    console.log("$$Access^%NSP="+dir);
    dir = db.function("DEFDIR^%SYS.GLO");
    console.log("$$DEFDIR^%SYS.GLO()="+dir);
} catch(error) {
    console.dir(error);
}

