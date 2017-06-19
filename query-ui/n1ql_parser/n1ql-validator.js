// n1ql-validator.js

var parser = require("./n1ql").parser;

var queries = [
    "select * from foo",
    "select select from from"
];

for (var i=0; i< queries.length; i++) {
    var query = queries[i];
    try {
	var result = parser.parse(query);
	console.log("Parse result for `" + query + "` is: " + result);
    }
    catch (err) {
	console.log("Parse error for `" + query + "` is: " + err.message);
    }
}

