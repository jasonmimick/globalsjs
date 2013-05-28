        function foo() {
                    return "whoa, it's " + new Date() + " already!";
                        }
    function hi(dude) { return "Hi " + dude + "!"; }
        function m1() {
                    var x = 5;
                            var y = 10;
                                    var me = "Jason";
                                            return x+y+me;
                                                }

console.dir('hi(\'Jason\')='+hi('Jason'));
console.dir('m1()='+m1());
