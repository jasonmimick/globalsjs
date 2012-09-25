var client = require('../client.js');
var test_client = new client.Client();
// test
var load = 0;//10000;//0;//10; //00;
var obj = { music : ['Bach','Booker Ervin','Keith Jarrett'] };
var lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller'];
var arr = [];
test_client.connect();
for(var i=0; i<load; i++) {
	obj.lastName=lastNames[Math.floor(Math.random()*lastNames.length)];
	obj.age = i;
	test_client.send( obj );
	arr.push(obj);
}
//test_client.send( arr );
var dbreq = {};
dbreq.collection = 'testAsync';
dbreq.op = 'find';
dbreq.params = [ { firstName : 'Jim Jimmy995' } ];
// this test finds one object and then updates it.
var result = test_client.send( dbreq, function(error,data) {
	console.log('Got me some datar back!');
	console.dir(data);
	var savereq = {};
	savereq.collection = 'testAsync';
	savereq.op = "save"
	data.food = "tcp nachos " + (new Date).toString();
	savereq.params = [];
	savereq.params.push(data);
	console.log('~~~~~~~~~~~');
	console.dir( ' - save request - ');console.dir(savereq);

	test_client.send( savereq, function(error2, data2) {
		console.log('back from save');
		console.dir(data2);
		debugger;	
		test_client.close();
	});

});


