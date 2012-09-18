var data = require('./customers_data.js');
var util = require('util');

util.inspect(data);
util.inspect(data.customers_dataset());
console.log(data);
console.log(data.customers_dataset);
var customers = data.customers_dataset();
console.log(customers);
console.log(customers.length);



