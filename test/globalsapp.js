var cache = require('../../globalsjs');
var db = new cache.Db('/Users/jasonmimick/dev/globalsdb/mgr',{},{recordQueryStats:true})
db.connect({ collections : ['customers'] });
//console.dir(db);
var data = require('./customers_data.js');

var customers = data.customers_dataset();
for(var i=0; i<customers.length; i++) {
	db.customers.save(customers[i]);	
}

db.customers.find({}, function(err,object) {
	if (err) {
		console.log(err);
		return;
	}
	console.dir(object);
});


