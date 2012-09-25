var gdb = require('../../globalsjs');
var op = new gdb.DbOp('operation', [1,2,"foo",['a',2,3]]);
console.dir(op);

var s = op.serialize();
console.dir(s);

var t = gdb.deserializeDbOp(s);
console.dir(t);

console.dir( op==t );
console.dir(gdb.DbOp.FIND);
