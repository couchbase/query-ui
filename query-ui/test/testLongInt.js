    // match ints with 16 or 17 digits - long enough to cause problems
    var matchNonQuotedLongInts = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[:\s\[,](\-?[0-9]{16,})[,\s\]}]|[:\s\[,](\-?[0-9\.]{17,})[,\s\]}]/ig;
    // we also can't handle floats bigger than Number.MAX_VALUE: 1.798e+308, these help us detect them
    var matchNonQuotedBigFloats = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[:\s\[,](\-?[0-9]+(?:\.[0-9]+)?[eE]\+?[0-9]{3,})[,\s\]}]/ig;

    // see if there is at least one overly large float in the JSON string
    // we search for something that looks like a floating point number, and then 
    // parse it using "Number()". If the number is too big, it parses to Infinity.
    function hasLongFloat(rawBytes) {
      matchNonQuotedBigFloats.lastIndex = 0;
      var hasLongFloats = false;

      // look for overly large floats
      var matchArray = matchNonQuotedBigFloats.exec(rawBytes);
      while (matchArray != null) {
        //console.log("Got float match array: " + JSON.stringify(matchArray));
        if (matchArray[1] && !Number.isFinite(Number(matchArray[1]))) {
            hasLongFloats = true;
            break;
          }
        
        matchArray = matchNonQuotedBigFloats.exec(rawBytes);
        //console.log("Got float match array2:" + JSON.stringify(matchArray));
      }
      return hasLongFloats;
    }

    // see if there is at least one overly large int in the JSON string
    function hasLongInt(rawBytes) {
      matchNonQuotedLongInts.lastIndex = 0;
      var hasLongInts = false;

      // look for overly large ints
      var matchArray = matchNonQuotedLongInts.exec(rawBytes);
      while (matchArray != null) {
        if (matchArray[1] || matchArray[2]) { // group 1, a non-quoted long int, group 2, a long decimal)
          hasLongInts = true;
          break;
        }
        matchArray = matchNonQuotedLongInts.exec(rawBytes);
      }
      return(hasLongInts);
    }

var goodNumbers = [
  "123456789012345",
  "-123456789012345",
  "12345.6789012345",
  "-12345.6789012345",
  "123.456e+306",
  "-123.456e+306",
  "123.456e-200",
  "123.456e200",
];

var badFixedNumbers = [
  "1234567890123456",
  "-12345.67890123456",
];
var badFloatNumbers = [
  "123.456e+309",
  "123e+310",
];

var testStrings = [
  `{"simpleDoc":$$$}`,
  `{"subObjectOnly":{"number":$$$}}`,
  `{"subObjectFirst":{"number":$$$,"foo":123}}`,
  `{"arrayOneValOnly":[$$$]}`,
  `{"arrayAtStart":[$$$,2,"hello",true]}`,
  `{"arrayLongInMid":["hello",true,$$$,1,2,3]}`,
  `{"arrayLongAtEnd":["hello",true,$$$]}`
];


console.log("Good numbers:");
goodNumbers.forEach(function(num) {
    testStrings.forEach(function(str) {
        var newStr = str.replace("$$$",num);
        console.log("hasLongInt:  " + hasLongInt(newStr) + "\t" + newStr);
        console.log("hasBigFloat: " + hasLongFloat(newStr) + "\t" + newStr);
    });
});

console.log();
console.log("Bad fixed numbers:");
badFixedNumbers.forEach(function(num) {
    testStrings.forEach(function(str) {
        var newStr = str.replace("$$$",num);
        console.log("hasLongInt:  " + hasLongInt(newStr) + "\t" + newStr);
    });
});

badFloatNumbers.forEach(function(num) {
    testStrings.forEach(function(str) {
        var newStr = str.replace("$$$",num);
        console.log("hasBigFloat: " + hasLongFloat(newStr) + "\t" + newStr);
    });
});
