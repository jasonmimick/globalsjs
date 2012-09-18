// main driver gloablsjs unit test suite 
// defines some basic 'assert' functions
// runs all tests.
var red, blue, reset;
red   = '\u001b[91m';
green = '\u001b[92m';
blue  = '\u001b[96m';
reset = '\u001b[0m';
//var assert = require('assert');

function __assertEquals(a,b,failMessage) {
	if ( a !== b ) {
		__failMessage(failMessage);
		//throw failMessage;
	}
}

function __assertTrue(condition, failMessage) {
	if ( !condition ) {
		__failMessage(failMessage);
		//throw failMessage;
	}
}

function __failMessage(msg) {
		process.stdout.write(red + 'Test Failed! ' + reset);
		if ( msg !== undefined ) {
			console.log(green + msg + reset);
		}
		if ( process.env.GLOBALSJS_TRACE == 'true' ) {
			process.stdout.write(blue);
			console.trace();
			process.stdout.write(reset);
		}
}
exports.__assertTrue = __assertTrue;
exports.__assertEquals = __assertEquals;


/*
* Test Suite Runner
*/
(function() {
	var utd = {};
	utd.GLOBALS_HOME = process.env.GLOBALS_HOME; 
	if (process.argv[2] !== undefined ) {
		utd.GLOBALS_HOME = process.argv[2];
	}
	if ( utd.GLOBALS_HOME === undefined ) {
		throw "Unable to set root of GlobalsDB installation.";
	}
	//console.dir(process.argv);
	utd.testsets = [];
	if ( process.argv.length <= 2 ) {
		utd.testsets.push('./sync_test.js');
	} else {
		for(var i=2; i<process.argv.length; i++ ) {
			utd.testsets.push(process.argv[i]);
		}
	}
	//console.dir(utd.testsets);
	utd.testsets.forEach( function(testset) {
		var foo = require(testset);
	});
})();		// local-scope - test runner.


