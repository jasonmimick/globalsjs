var connection_string = process.argv[2];
var globalsjs = require('../../globalsjs');
debugger;
var db = new globalsjs.Db( connection_string );
// fetch remote earthquake data
var http = require('http');
var data_url = {
    host : 'earthquake.usgs.gov',
    port : 80,
    path : '/earthquakes/feed/geojson/1.0/week'
};
var data_set = '';
var data_set_req = http.get( data_url, function(result) {
    debugger;
    console.dir("Got result " + result.statusCode );
    console.dir(result);
    result.on('data', function(chunk) {
        data_set += chunk;
    });
    result.on('end', function(x) {
        //console.dir(data_set);
        db.connect( { collections : [ 'earthquakes' ] } );
        var data = JSON.parse(data_set);
        //console.dir(data);
        for (var i=0; i<data.features.length; i++) {
            db.earthquakes.save( data.features[i] );
        }
    });

}).on('error', function(error) {
    console.log("Got error: ");
    console.dir(result);
});

