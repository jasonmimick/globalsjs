var globalsjs = require('../globalsjs');
/*
 * ensemble.js 
 * Node wrapper ground globalsjs for defining
 * and running Ensemble productions from a node
 * environment.
 */

function Production(name, config) {
    var self = this;
    this.name = name;
    this.config = config;
    this.services = {};
    this.operations = {};
}
Production.prototype.addService = function(config) {
    var self = this;
    // TO-DO validate we have config.Name
    self.services[config.Name]=config;
}
Production.prototype.addOperation = function(config) {
    var self = this;
    self.operations[config.Name]=config;
}
Production.prototype.toString = function() {
    return JSON.stringify(self);
}
Production.prototype.start = function( callback ) {
    var self = this;
    callback( "", { message : 'NOOP: Production ' + self.name + ' started.' });
}
Production.prototype.stop = function( callback ) {
    var self = this;
    callback( "", { message : 'NOOP: Production ' + self.name + ' stopped.' });
}

// Director
function Director(connection_string, namespace) {
    debugger;
    var self = this;
    self.connection_string = connection_string;
    self.namespace = namespace;
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
    } catch(error) {
        throw error; 
    }
}
// send a message to the targetConfig in Ensemble and 
// return a response
Director.prototype.onRequest = function(req, targetConfig) {
    var self = this;
    try {
        // should route requests based upon url
        return self.db.function("$$onRequest^noble",JSON.stringify(req),targetConfig);
    } catch (error) {
        console.dir(error);
        throw error;
    }
}
Director.prototype.deploy = function(production,callback) {
    var self = this;
    // - send JSON.stringified production to Caché
    // which can then parse and generate code
    var jp = JSON.stringify(production, function(k,v) {
        if ( typeof v === 'function' ) {
            return v + '';
        }
        return v;
    });
    console.dir(jp);
    var results = self.db.function("$$Test1^noble",jp);
    console.dir(results);
    var result = JSON.parse(results);
    console.dir(result);
    callback( "", { message : 'NOOP: Deployed production ' + production.name});
}

exports.Production = Production;  
exports.Director = Director;
