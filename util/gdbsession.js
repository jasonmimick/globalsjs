/// NOTE - this is the OLD 0.6.18ish version... 0.8.8 has much better!
var ABOUT = "gdbsession v0.0.1 jmimick@gmail.com";
var DESCRIPTION = 'interactive node.js based repl session for globalsdb - just like good old mumps';
var globalsdb = require('cache');
var repl = require('repl');
var path = require('path');
var globalsdb_home = process.env.GLOBALS_HOME; 
if (process.argv[2] !== undefined ) {
	globalsdb_home = process.argv[2];
}
globalsdb_home = path.join(globalsdb_home,'mgr');
(function() {
	var exit = false;
	var m = '\''+globalsdb_home + '\' is not a valid directory. ';
	m += 'Set this to the root of your GlobalsDB installation.';
	try {
		if ( !path.existsSync(globalsdb_home) ) {
			exit = true;
		} 
	} catch(e) {
		exit = true;
	} finally { 
		if ( exit ) {
			console.log(m);
			process.exit(1);
		}
	}
})();

var main_prompt = globalsdb_home+'>';
function processInput(cmd, context, filename, callback) {
	console.dir(arguments);
	var result = "foo";
	callback(null, result);

}
var COMMANDS = {
	'S' : SET,
	'SET' : SET,
	'K' : KILL,
	'KILL' : KILL,
	'D' : DO,
	'DO' : DO,
	'H' : HALT,
	'HALT' : HALT,
	'?' : HELP,
	'HELP' : HELP
};
var PROGRAMS = {
	'^%G' : percent_G
};
var STATE;
function processInputMain(cmd,callback) {
	var cmd = cmd.substring(1,cmd.length-1).trim();
	var first = cmd.split(' ')[0].toUpperCase();
	if ( cmd == undefined ) {
		return;
	}
	//debugger;
	//console.log("STATE");console.dir(STATE);
	//console.log("cmd");console.dir(cmd);
	if ( STATE !== undefined ) {
		STATE(cmd);
	} else {
		if ( COMMANDS[first]!==undefined ) {
			STATE = COMMANDS[first];
			COMMANDS[first](cmd);
		} else {
			STATE = undefined;
			process.stdout.write(main_prompt);
		}
	}
}
function HELP() {
	console.log(ABOUT);
	console.log(DESCRIPTION);
	console.log("availble commands:");
	for(var cmd in COMMANDS) {
		process.stdout.write(cmd+' ');
	}
	console.log("\navailble programs:");
	for(var p in PROGRAMS) {
		process.stdout.write(p + ' ');
	}
	console.log();
	STATE = undefined;
	process.stdout.write(main_prompt);
}
function DO(cmd) {
	var program = cmd.split(' ')[1];
	if ( PROGRAMS[program]!==undefined ) {
		STATE = PROGRAMS[program];
		PROGRAMS[program](cmd);
	}
}
function HALT(cmd) {
	process.exit(0);
}
function SET(cmd) {
	var glo_ref = parse_glb_ref(cmd);
	if ( glo_ref.ERROR ) {
		STATE = undefined;
		process.stdout.write(main_prompt);
		return;
	}
	console.dir(glo_ref);
	var cache = open_connection();
	var result = cache.set(glo_ref);
	if ( !result.ok ) {
		console.dir(result);
	}	
	cache.close();
	STATE = undefined;
	process.stdout.write(main_prompt);
	return;
}
function KILL(cmd) {
	var glo_ref = parse_glb_ref(cmd);
	if ( glo_ref.ERROR ) {
		STATE = undefined;
		process.stdout.write(main_prompt);
		return;
	}
	var cache = open_connection();
	process.stdout.write('about to kill-->');console.dir(glo_ref);
	var result = cache.kill(glo_ref);
	if ( !result.ok ) {
		console.dir(result);
	}	
	cache.close();
	STATE = undefined;
	process.stdout.write(main_prompt);
	return;
}
function parse_glb_ref(cmd) {
	if ( cmd.indexOf(' ') == -1 ) {
		return { ERROR : 1 }
	}
	var glb = cmd.substring(cmd.indexOf(' ')+1,cmd.length)
	var glo_ref = {
		global : '',
		subscripts : [],
		data : '' };
	var gg = glb.split('=');
	var ss = gg[0].split('(');
	if ( ss.length > 1 ) {
		if ( ss[1].indexOf(')', ss[1].length-1) !== -1 ) { 	// ends with a ')'
			ss[1] = ss[1].split(')')[0];
		}
		subs = ss[1].split(','); 
		glo_ref.subscripts = subs;
	} 
	glo_ref.global = ss[0];
	if ( gg.length > 0 ) {
		glo_ref.data = gg[1];
	}
	return glo_ref;
}
var percent_G_first = true;
function percent_G(cmd,callback) {
	//console.log("%G---> " + cmd + 'percent_G_first='+percent_G_first);
	//prompt = 
	var gprompt = "Global ^";
	if ( percent_G_first ) {
		process.stdout.write(gprompt);
		percent_G_first = false;
		return;
	}
	// now if just return at prompt, then back to main loop...
	if ( cmd === 'undefined' ) {
		STATE = undefined;
		percent_G_first = true;
		process.stdout.write(main_prompt);
		return;
	}
	
	var global = cmd; //cmd.substring(1,cmd.length-1).trim();
	//console.dir(global);
	if ( global === '?' || global.indexOf("*")>-1 ) {
		global_directory_dump(global);
	} else {
		global_dump(global);
	}
	process.stdout.write(gprompt);
}

function open_connection() {
	var cache = new globalsdb.Cache();
	var conninfo = {
		path : globalsdb_home,
		user : "percentG.js",
		password : "Is This Secure?",
		namespace : "Wish this worked"
	};
	cache.open( conninfo );
	return cache;
}

function global_directory_dump(global) {
	var cache = new globalsdb.Cache();
	var conninfo = {
		path : globalsdb_home,
		user : "percentG.js",
		password : "Is This Secure?",
		namespace : "Wish this worked"
	};
	cache.open( conninfo );
	__glb_dir_dump(cache,global);
	cache.close();
}
function __glb_dir_dump(cache, global) {
	if ( global === undefined ) { return; }
	var opts = {};
	if ( global.indexOf("*") > -1 ) {
		var base = global.split('*')[0];
		var lo = 'a',hi = 'Z';
		for (var i=0; i<(32-base.length); i++ ) { lo += 'a'; hi += 'Z'; }
		opts.lo = base;
		opts.hi = base+hi;
	}
	//console.dir(opts);
	var result = cache.global_directory( opts );		
	//console.dir(result);
	console.log('\tGlobal Directory Display of '+globalsdb_home);
	console.log('\t\t' + new Date() );
	console.log();
	for(var i=0; i<result.length; i+=3 ) {
		for(var j=0; j<3; j++) {
			if ( i+j < result.length ) {
				var global = result[i+j];
				var spaces = ' ';
				for(var k=0; k<(32-global.length); k++) { spaces += ' '; }
				process.stdout.write(global+spaces);
			}
		}
		console.log();
	}
	console.log('\n' + result.length + " globals listed");
	//console.dir(result);
	//console.log(JSON.stringify(result, null, '\t'));	
}
function global_dump(global) {
	if ( global === undefined ) {
		return;
	}
	var cache = new globalsdb.Cache();
	var conninfo = {
		path : globalsdb_home,
		user : "percentG.js",
		password : "Is This Secure?",
		namespace : "Wish this worked"
	};
	var subs = [];
	// foo
	// foo(1
	// foo(1,2,3,4
	// foo(1,2)
	var ss = global.split('(');
	if ( ss.length > 1 ) {
		global = ss[0];
		if ( ss[1].indexOf(')', ss[1].length-1) !== -1 ) { 	// ends with a ')'
			ss[1] = ss[1].split(')')[0];
		}
		subs = ss[1].split(','); 
	} 
	var glo_ref = { global : global, subscripts : subs };
	cache.open( conninfo );
	var dd = cache.data(glo_ref);
	if ( dd.defined == 1 || dd.defined == 11 ) {  // there is data at this exact node
		glo_ref = cache.get(glo_ref);
		console.log(format_glb_output(glo_ref));
	}
	if ( dd.defined != 0 ) {
		// now spin forward.
  	while ( (glo_ref = cache.next_node(glo_ref)).defined != 0 ) {
			//console.dir(glo_ref);
			if ( glo_ref.global === undefined ) { break; }
			console.log(format_glb_output(glo_ref));
		}
	}
	cache.close();
}

function format_glb_output(glo_ref) {
	var out = '^'+glo_ref.global;
	if ( glo_ref.subscripts !== undefined ) {
  	out += '('+glo_ref.subscripts.join()+')';
	} 
  out += '='+glo_ref.data;
	
	return out;
}
var greeting = '\
  ______ ______  ______  _______ _______ _______ _______ _____  _____  __   _\n\
 |  ____ |     \\ |_____] |______ |______ |______ |______   |   |     | | \\  |\n\
 |_____| |_____/ |_____] ______| |______ ______| ______| __|__ |_____| |  \\_|';
                                                                         
(function() {
	console.log(greeting);
	console.log('a node.js powered REPL for GlobalsDB');
	try {
		var c = open_connection();
		console.log( c.about() );
		c.close();
	} catch(e) {
		var m = 'Unable to connect to globalsdb in ' + globalsdb_home;
		m += " - verify your globalsdb installation.";
		console.log(m);
		console.error(e);
		process.exit(1);
	}
})();

if ( process.version.split('.')[1] > 6 ) {
	repl.start({ 
		prompt : prompt,
  	input : process.stdin,
  	output : process.stdout,
		eval : processInput
	});
} else {

	repl.start(main_prompt,process,processInputMain);
}


