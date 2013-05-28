var ens = require('../ensemble.js');
function create_production() {
    var foop = new ens.Production("foo.fooProduction");
    // the 'addService' forwards node http requests to add numbers
    // off to ensemble to get processed and sends the results back
    // well, in this - the service will return a token to the caller
    // which can then be used to fetch the answer - this is all async
    var adderrService = foop.addService(
        { Name : "myFooAdderService",
          ClassName : "noble.node.HTTPPassthroughService",
          AdapterClassname : "noble.node.InboundHTTPAdapter",
          Comment : "It's it cool to run ensemble from javascript!",
          Settings : [
            { Target : "Host",
                Name : "TargetConfigNames",
               Value : "myFooFileProcessor" /* odd name, but we catch the foo.Message.Math.Add there*/
            },
            { Target : "Adapter",
                Name : "Port",
               value : "8080"
            },
         ]
        });
    var adderrOperation = foop.addOperation(
            { Name : "myFooAdderOp",
              ClassName : "foo.adder.Operation",
              Comment : "Adder implemented in javascript",
              MessageMap : [
                { MessageType : "foo.Message.Math.Add", Method : "AddMessage" }
              ],
              AddMessage : function(req,resp) {
                resp.Result = req.x + req.y;
                var fs = require('fs');
                fs.write('/tmp/adder.log');
              }

            });
    var fileService = foop.addService(
        { Name : "myFooFilePasser",
          ClassName : "EnsLib.File.PassthroughService",
          Comment : "This is a service created from javascript",
          Settings : [
             { Target : "Adapter",
                 Name : "FilePath",
                Value : "/tmp/foo/in"
             },
             { Target : "Adapter",
                 Name : "FileSpec",
                Value : "*.foo"
             },
             { Target : "Host",
                 Name : "TargetConfigNames",
                Value : "myFooFileProcessor"
             }
          ]
        });
    // Simple copy file operation
    // eventually, the api will support injecting
    // some node module in for the 'Adapter'
    var fooOp = foop.addOperation(
        { Name : 'myFooFileProcessor',
          ClassName : 'foo.fooFileProcessor',
          Adapter : 'EnsLib.File.OutboundAdapter',
          OnMessage : function(req, resp, status) {
            var fs = require('fs');
            var data = fs.readFileSync(req.OriginalFileName);
            try {
                fs.writeFileSync(req.OriginalFileName+".out",data,'base64');
            } catch(err) {
                    resp.Error = JSON.stringify(err);
            }
          },
          MessageMap : [
            { MessageType : "foo.Message.Math.Add", Method : "AddMessage" }
          ],
          AddMessage : function(req,resp) {
            resp.Result = req.X + req.Y;
          }
        });
    return foop;
}

var connection_string = process.argv[2];
var ensns = "ENSDEMO";
if ( process.argv[3] ) {
    ensns=process.argv[3];
}
console.dir(connection_string + ' namspace=' + ensns);

var foop = create_production();
console.dir(foop);
var director = new ens.Director( connection_string, ensns);
director.deploy(foop, function(error,result) {
    if (error) { console.dir(error); return; }
    console.dir(result);
    foop.start( function(error, result) {
        if (error) { console.dir(error); return; }
        console.dir(result);
        // here we can dump some .foo files to get processed
        // once we get start and stop to work ;<>)
        foop.stop( function(error,result) {
            if (error) { console.dir(error); retuen; }
            console.dir(result);
        });
    });
});


