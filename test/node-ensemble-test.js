/* Testing out ways to wrap ensemble functionality
 * from node.js
   Author: jmimick@intersystems.com

   Usage:
   >node test/node-ensemble-test.js  <GlobalsDbConnectionString> <NAMESPACE>
   
   where, <GlobalsDbConnectionString> is
    + Path to GlobalsDB installation
    + URL to listening globalsjs network deamon, e.g.
        http://localhost:11115
        
   and, <NAMESPACE> is some Ensemble enabled namespace in the target system

   To enable debug tracing, export GLOBALSJS_DEBUG_OUTPUT=true
*/

// Sample #1 - sync

var connection_string = process.argv[2];
var ensns = "ENSDEMO";
if ( process.argv[3] ) {
    ensns=process.argv[3];
}
console.dir(connection_string + ' namspace=' + ensns);
var globalsjs = require('../../globalsjs');
var db = new globalsjs.Db( connection_string );

// Decorate db with some "ensemble-ness" - make her "Ensemblware"
// end decoration - this code will get merged into refactord Db class
function EnsProduction(name,db) {
    var self = this;
    self.name = name;
    self.db = db;
}
EnsProduction.prototype.start = function(callback) {
    var self = this;
    //var r = self.db.function('zStartProduction^Ens.Director.1',callback);
    var r = self.db.function(
        { function : "Ens.Director.StartProduction",
          arguments : [ self.name ]
        }, callback);
    return r;
    
};
EnsProduction.prototype.stop = function(callback) {
    var self = this;
    var r = self.db.function('zStopProduction^Ens.Director.1',callback);
    return r;
};
    
db.connect( { namespace: ensns },
    function(error,info) {
        // here we can inject some ensemble stuff.
        var summary = {};
        console.dir(db);
        var dir = db.function("DEFDIR^%SYS.GLO");
        console.dir(dir);
        debugger;
        var p = JSON.parse(db.function('cd^gu',ensns));
        console.dir(p);
        var pp = JSON.parse(db.function('ensProds^gu'));
        console.dir(pp);
        for (var i=0; i<pp.length; i++) {
            var prod = new EnsProduction(pp[i].name,db); 
            var n = pp[i].name.replace('/\./g','_'); // convert .'s in production name to _
            db[pp[i].name]=prod;
        }
        run_test();
    }
);
function run_test() {
    db.Demo_HL7_MsgRouter_Production.start(function(error,result) {
        console.dir(error);
        console.dir(result);
        db.Demo_HL7_MsgRouter_Production.stop(function() { console.dir('stop'); console.dir(arguments); });

    });
}

/*
db.fooproduction.start( function(info) {
    console.dir(info);
    this.
});
*/

