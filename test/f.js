g = require('../../globalsjs');
db = new g.Db();
db.connect();
console.dir(db);
db.stocks.reIndex(function (e,r) {
	console.dir(arguments);
});

