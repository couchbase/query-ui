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
	console.log("\n\nParse result for \n\n" + query + "\n\nis: \n\n" + JSON.stringify(result,null,2));
    }
    catch (err) {
	console.log("\n\nParse error for \n\n" + query + "\n\nis: " + err.message);
    }
}

