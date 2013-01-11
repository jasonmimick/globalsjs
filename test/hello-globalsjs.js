/* Hello World example for globaljs 
   Author: jmimick@intersystems.com

   Usage:
   >node test/hello-globalsjs.js <GlobalsDbConnectionString>
   
   where, <GlobalsDbConnectionString> is
    + Path to GlobalsDB installation
    + URL to listening globalsjs network deamon, e.g.
        http://localhost:11115
        
   Be sure you do have have any data stored in 
   ^foopeople

   To enable debug tracing, export GLOBALSJS_DEBUG_OUTPUT=true
*/

// Sample #1 - sync

var connection_string = process.argv[2];
var globalsjs = require('../../globalsjs');
var load_size = 1; //100;
var db = new globalsjs.Db( connection_string );
// create new collection - 'foopeople'
db.connect( { collections : [ 'foopeople', 'books' ] } ); 

db.books.ensureIndex( { Author : 1 });
db.books.ensureIndex( { Price : 1 });
var book = { Author : 'Bill Bryson', Price : 14.99, Title : 'A Walk in the woods', Copyright : '1999' };
var book2 = { Author : "Madeleine L'Engle", Price : 9.99, Title : 'A Wrinkle in Time', Copyright : '1962' };
db.books.save(book);
db.books.save(book2);
db.books.ensureSQL( book );
return; // for testing
db.foopeople.ensureIndex( { name : 1 } );
// create and save some folks
for(var i=0; i<load_size; i++) {
    var data = { name : 'Person' + i, age : i, email : 'user_'+i+'@hello.org' };
    if ( i==0 ) {
        db.foopeople.ensureSQL(data);
    }
    db.foopeople.save(data);    
}
return;
console.log( 'There are now ' + db.foopeople.count() + ' foopeople.');
// check that Person73 is 73 years old.
var p73 = db.foopeople.findOne( { name : 'Person73' } );
console.log( 'Person73 is ' + p73.age + ' years old.');

db.foopeople.ensureIndex( { email : 1 } );
db.foopeople.reIndex();
// find the folks where 20 <= age < 30
var twentySomethings = db.foopeople.find( { $and : [ { age : { $gte : 20 } }, { age : { $lt : 30 } } ] } );
for(var dude in twentySomethings) {
    console.log(dude.name); 
}
/*
if ( db.foopeople.count() > 0 ) {
    db.foopeople.remove();  // clean out
}
console.log( 'Removed all foopeople, count=' + db.foopeople.count() );
*/
// Sample #2 - async


