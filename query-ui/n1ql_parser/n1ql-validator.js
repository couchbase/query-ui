// n1ql-validator.js

var parser = require("./n1ql").parser;

function queryArray() {
  var queries = [
    //  "select * from foo order by boo.moo.goo",
    //"select foo from loo",
    //"(distinct (array (`r`.`flight`) for `r` in `schedule` end))"
    //"select first e.`desc` for e in props.bom_concrete_type when e.id = \"1\" end as `desc` from default;"
    //"any foo in reviews satisfies foo.ratings.Overall = 5 end"
    //"array {\"content\": review.content, \"ratings\" : review.ratings} for review in reviews when every bar within review.ratings satisfies bar = 1 end end"
    //"first item.content for item in bar end"
    "select q.type from `beer-sample` q;"
    //"select foo.moo.goo[a.b.c].boo from loo",
    //"foo < bar",
    //"foo < bar; foo > bar;"
    //"update beer set type = 'foo' where othertype = 'bar'",
    //"select foo.bar.boo[z.y.x].moo from foo where a.b.c.d > 0",
    //"distinct array i for i in address when i < 10  END"
    //"create index idx6 on `beer-sample`(distinct array i for i in address END);"
    // "select select from from"
    ];


  for (var i=0; i< queries.length; i++) {
    var query = queries[i];
    try {
      console.log("\n\nParsing: \n\n" + query + "\n");
      var result = parser.parse(query);
      console.log("\nresult is: \n\n" + JSON.stringify(result,null,2));
    }
    catch (err) {
      console.log("\n\nParse error for \n\n" + query + "\n\nis: " + err.message);
    }
  }
}

function queryFile() {
  var lineReader = require('readline').createInterface({
//    input: require('fs').createReadStream('/Users/eben/src/jison/examples/query.txt')
    input: require('fs').createReadStream('/Users/eben/src/jison/examples/queries.txt')
  });

  lineReader.on('line', function (line) {

    try {
      var result = parser.parse(line);
      console.log("\n\nParsed:" + line + "\n\n");
      if (result && result[0])
        console.log("paths used: \n\n" + JSON.stringify(result[0].pathsUsed,null,2));
    }
    catch (err) {
      console.log("\n\nParse error for \n\n" + line + "\n\nis: " + err.message);
    }
  });
}


//queryFile();
queryArray();