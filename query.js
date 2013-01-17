/*
Query processor -
Handles queries of the form
{ age : { $lt : 40 } }

object - one property, the name is the 'field_name'
                       the value is an expression which is an object
                       with one property, the name the operator, the value the 'value'
*/
function Expression(expression) {
    var self = this;
    if ( typeof expression != 'object' ) { // implicit equals case here
        expression = { $eq : expression };
    }
    self.operator = Object.keys(expression)[0];
    self.value = expression[self.operator];
    self.evaluators = {};
    self.evaluators["$eq"]="==";
    self.evaluators["$nq"]="!=";
    self.evaluators["$lt"]="<";
    self.evaluators["$lte"]="<=";
    self.evaluators["$gt"]=">";
    self.evaluators["$gte"]=">=";
}
Expression.prototype.toString = function() {
    return JSON.stringify(self);
}
Expression.prototype.evaluate = function(value) {
    var self = this;
    // build a code expression
    // wrap in quotes if NaN
    if (isNaN(value)) {
        var exp='"'+value+'"'+self.evaluators[self.operator]+'"'+self.value+'"';
    } else {
        var exp=value+self.evaluators[self.operator]+self.value;
    }
    //console.dir(exp);
    var result = eval(exp);
    return result;
}
/*
 * A query is one or more field_name/expression pairs.
 * If just one expression - then just a simple expression object
 * If more than one expression - then an array of expressions
 * which are embedded in an object with one-single property, the 
 * name of which is the "joiner" = "$and" or "$or" and whose value
 * is the array of expressions.
 * TO-DO - support initial argument which is an array of $and/$or clauses,
 * each of which is one or more expressions
 */
function Query(query) {
    var self = this;
    self.query_stack = []; // array of field/expressions
    debugger;
    var joiners = {
        $and : "&&",
        $or  : "||"
    };
    Object.keys(query).forEach(function(prop) {
        if ( prop[0]=="$" ) { // got 'joiner'
            join_mode = prop;
            if ( Array.isArray( query[prop] ) ) {
                for(var i=0; i<query[prop].length; i++) {
                    // TO-DO error hanlding - what if not good expression!
                    self.query_stack.push( query[prop][i] );
                }
            } else {
                self.query_stack.push( quer[prop] );
            }
            // TO-DO check for valid joiner!
            self.query_stack.push(joiners[prop]);
        } else { // just expression
            self.query_stack.push(query); // ??? not sure here
        }
    });
    //console.dir(self.query_stack);
}
Query.prototype.toString = function() {
    return JSON.stringify(self);
}
Query.prototype.execute = function(data_set) {
    var self = this;
    var results = [];
    //console.dir(self);
    for(var i=0; i<data_set.length; i++) {
        var data_row = data_set[i];
        var eval_results = [];
        var hit_joiner = false;
        for(var j=0;j<self.query_stack.length;j++) {
            var e = self.query_stack[j];
            if ( typeof e === 'string' ) { // a joiner
                // if OR, then add row if ANY eval_result was true
                // if AND, then add row only if ALL eval_results's were true
                //
                hit_joiner = true;
                var rr='';
                for(k=0;k<eval_results.length;k++) {
                    rr+=eval_results[k];
                    if ( k<eval_results.length-1 ) {
                        rr+=e;  // append operator
                    }
                }
                //console.dir(rr);
                var add_row = eval(rr);
                if ( add_row ) {
                    results.push( data_row );
                }
                continue;
            }
            var prop_name = Object.keys(e)[0];
            // if row does not contain property, then continue
            var gotProperty = false;
            Object.keys(data_row).forEach(function(rp) {
                if ( rp==prop_name ) {
                    gotProperty = true;
                }
            });
            if ( !gotProperty ) {
                continue;
            }
            var exp = new Expression(e[prop_name]); // TO-DO cache expressions?
            var r = exp.evaluate(data_row[prop_name]);
            eval_results.push(r);
        }
        // if we did not it a joiner clause, and we did find results
        // then we should push them out - :
        if ( !hit_joiner ) {
            var add_row = false;
            // if eval_results.length > 1 - should be error,
            // only in this case if the query was just a single
            // prop_name/expression pair
            // TO-DO handle error in that case
            if ( eval_results.length>0 ) {
                if ( eval_results[0] ) {
                    results.push(data_row);
                }
            }
        }
    }
    return results;
}
exports.Expression = Expression;
exports.Query = Query;
