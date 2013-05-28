// simple http server run from Ensemble.
// will hand off requests to the adapter to send to servier

var ensemble = require('./ensemble.js');
if ( process.argv.length < 6 ) {
    console.dir("INVALID args " + JSON.stringify(process.argv));
    return;
}
var port = process.argv[2];
var connection_string = process.argv[3];    // required!
var namespace = process.argv[4];  //default
var targetConfigNames = process.argv[5];

var url = require('url');
var http = require('http');

var querystring = require('querystring');

function postRequest(request, response, callback) {
    var queryData = "";
    if(typeof callback !== 'function') return null;

    if(request.method == 'POST') {
        request.on('data', function(data) {
           queryData += data;
           console.log('data='+data);
            if(queryData.length > 1e6) {
                queryData = "";
                response.writeHead(413, {'Content-Type': 'text/plain'});
                request.connection.destroy();
            }
        });
                            
        request.on('end', function() {
            response.post = queryData; //querystring.parse(queryData);
            callback(queryData);
        });
                                    
    } else {
        response.writeHead(405, {'Content-Type': 'text/plain'});
        response.end();
    }
}

// connect up to Ensemble and fetch handle back to 
// the namespace & production we're servicing.
//

var director = new ensemble.Director( connection_string, namespace);
http.createServer(function (req, res) {
    if ( req.url == '/__shutdown__' ) {
        console.dir("Got shutdown");  
        process.exit(0);
    }  
    postRequest(req, res, function (data) {
        console.log(res.post);
        res.writeHead(200, {'Content-Type': 'text/plain'});
        console.dir(req.url);
        // send the request back to Ensemble to handle, send response back to client
        //
        debugger;
        // should have a way to route requests based upon url to the correct
        // production!
        var ensResponse = director.onRequest({"url":req.url, "data":data}, targetConfigNames);
        console.log('ensResponse='+ensResponse);
        //console.dir( JSON.parse(ensResponse) );
        res.write( ensResponse );
        res.end('Hello World\n');
    });
}).listen(port, '127.0.0.1');
console.log('Ensemble httpserver start.');
console.log('namespace='+namespace+' targetConfigNames='+targetConfigNames);
console.log('Server running at http://127.0.0.1:'+port+'/');
