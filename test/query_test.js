var q=require('../query.js');
var e1 = new q.Expression({ $eq : 1 });
var e1r = e1.evaluate(1);
console.log("{ 1 : { $eq : 1}}="+e1r);
var e2 = new q.Expression({ $lte : 500});
var e2r1 = e2.evaluate(100);
var e2r2 = e2.evaluate(500);
var e2r3 = e2.evaluate(10000);

console.log("{ 100 : { $lte : 500}}="+e2r1);
console.log("{ 500 : { $lte : 500}}="+e2r2);
console.log("{ 10000 : { $lte : 500}}="+e2r3);

var e3 = new q.Expression({ $eq : "apple"});
var e3r1 = e3.evaluate("apple");
var e3r2 = e3.evaluate("bananna");

console.log('{"apple" : { $eq : "apple"}}='+e3r1);
console.log('{"apple" : { $eq : "bananna"}}='+e3r2);

// Now test queries
var data = [
    { age : 15, name : "Johnny" },
    { age : 30, name : "Suzy" },
    { age : 4, name : "Timmy" },
    { age : 20, name : "Lisa" },
    { age : 29, name : "Nichole" }
];
var queries= [
     { $and : [ { age : { $gte : 20 } }, { age : { $lt : 30 } } ] }
    ,{ $or : [ { age : { $gte : 20 } }, { age : { $lt : 30 } } ] }
    ,{ $and : [ { age : { $gte : 4 } }, { age : { $lte : 15 } } ] }
    ,{ name : { $eq : "Suzy" } }
    ,{ name : { $nq : "Suzy" } }
    ,{ $or : [ { name : { $eq : "Timmy" } }, { age : { $neq : 4 } } ] } 
    ,{ name : "Suzy" }  /* support simple implicit $eq */
    ,{ age : 29 }
];
queries.forEach( function(query_string) {
    var query = new q.Query(query_string);
    var results = query.execute(data);
    console.dir(results);
});

