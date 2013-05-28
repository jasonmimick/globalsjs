/* $system.OBJ utilities from node.js */

var globalsjs = require('../globalsjs');
/*
self.db = new globalsjs.Db( connection_string );
    try { // attempt to switch to new namspace
        var res = self.db.connect( { namespace : namespace } );
        console.dir("Director connected to:" + self.db.namespace());
        self.db.namespace("SAMPLES");
        console.dir(self.db.namespace());
        self.db.namespace("ENSDEMO");
        console.dir(self.db.namespace());
        // fetch a reference to the production running here, if any
        var activeProductionInfo = self.db.function("$$getActiveProductionInfo^noble");
        console.log('activeProductionInfo=');
        console.dir(activeProductionInfo);
    }
    */
var actions = {}
actions['rf'] = "$$rf^noble";
actions['read'] = "$$readFile^noble";
actions['load'] = "$$loadFiles^noble";
actions['compile'] = "$$loadAndCompile^noble";

var run_action = function(connection_string, namespace, action, item) {
    var db = new globalsjs.Db(connection_string);
    db.connect( { namespace : namespace } );    
    debugger;
    db.namespace(namespace);
    var fn = '';
    if ( !actions[action] ) {
        fn='$$'+action+'^noble';
    } else {
        fn = actions[action];
    }
    if ( fn === '' ) {
        console.log("No function specified!");
        return;
    }
    console.log("Calling: "+fn+" with:"+item);
    var result = db.function(fn,item);
    return result;
};

var action = process.argv[2];
var connection_string = process.argv[3];
var namespace = process.argv[4];

for (var i=5;i<process.argv.length;i++) {
    debugger;
    console.log(run_action(connection_string,namespace,action,process.argv[i]));
}
