/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { Injectable } from "@angular/core";

export { QwFixLongNumberService };


class QwFixLongNumberService {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
  ]}

  constructor() {
    Object.assign(this, getQwFixLongNumberService());
  }
}

//
// the qwConstantsService contains a number of constants used by the query workbench, such as
// queries, URL prefixes, etc. This version is defined for the regular query workbench inside
// the Couchbase admin UI, a different version will be defined for CBAS, and for the stand-alone
// version
//

function getQwFixLongNumberService() {

  var qflns = {};

  qflns.fixLongInts = fixLongInts;
  qflns.hasLongInt = hasLongInt;
  qflns.hasLongFloat = hasLongFloat;

  //
  // javascript can't handle long ints - any number more than 53 bits cannot be represented
  // with perfect precision. yet the JSON format allows for long ints. To avoid rounding errors,
  // we will search returning data for non-quoted long ints, and if they are found,
  // 1) put the raw bytes of the result into a special field, so that the JSON editor can
  //    show long ints as they came from the server
  // 2) convert all long ints into quoted strings, so they appear properly in the table and tree
  //    views
  //

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
      if (matchArray[1] && !Number.isFinite(Number(matchArray[1]))) {
        hasLongFloats = true;
        break;
      }

      matchArray = matchNonQuotedBigFloats.exec(rawBytes);
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
      if (matchArray[1] || matchArray[2]) { // group 1, a non-quoted long int, group 2, a long float)
        hasLongInts = true;
        break;
      }
      matchArray = matchNonQuotedLongInts.exec(rawBytes);
    }
    return(hasLongInts);
  }

  //
  // if the JSON string has long ints or floats, change them to strings
  //

  function fixLongInts(rawBytes) {
    if (!rawBytes)
      return rawBytes;

    // add a try/catch in case the regex fails

    try {
      var hasLongInts = hasLongInt(rawBytes);
      var hasLongFloats = hasLongFloat(rawBytes);

      // if no long ints, just return the original bytes parsed

      if (!hasLongInts && !hasLongFloats) try {
        return(JSON.parse(rawBytes));
      }
      catch (e) {
        return(rawBytes);
      }

      // otherwise copy the raw bytes, replace all long numbers in the copy, and add the raw bytes as a new field on the result
      else {
        // the regex can fail on large documents, just return rawJSON, and tables will show incorrect values
        if (rawBytes.length > 5*1024*1024) {
          var result = JSON.parse(rawBytes);

          var rawResult = findResult(rawBytes);
          if (rawResult)
            result.rawJSON = '\t' + rawResult;
          else
            result.rawJSON = rawBytes;
          return(result);
        }

        // now do ints and floats as necessary
        var curBytes = rawBytes;
        if (hasLongInts)
          curBytes = replaceRegExMatchWithString(curBytes,matchNonQuotedLongInts);
        if (hasLongFloats)
          curBytes = replaceRegExMatchWithString(curBytes,matchNonQuotedBigFloats);

        var result = JSON.parse(curBytes);

        // pull just the result out of the rawBytes
        var rawResult = findResult(rawBytes);

        if (rawResult)
          result.rawJSON = '\t' + rawResult;
        else
          result.rawJSON = rawBytes;

        return result;
      }

      // if the regex fails, we don't know if there are large numbers or not, mark as not editable
    } catch (except) {
      result = JSON.parse(rawBytes);
      result.rawJSON = rawBytes;
      result.rawJSONError = "Error checking document for long numbers: " + except.message;
      return(result);
    }
  }

  //
  // replaceRegExMatchWithString
  //
  // we want to be able to replace overly long integers or overly big floats with strings of the same
  // value. This function will take a regex and replace matches of it with strings.
  //
  //

  function replaceRegExMatchWithString(curBytes,regex) {
    regex.lastIndex = 0; // reset regex to beginning
    var matchArray = regex.exec(curBytes);
    var newBytes = "";

    while (matchArray != null) {
      if (matchArray[1]) { // group 1, a non-quoted long int
        //console.log("  Got match: " + matchArray[1] + " with lastMatch: " + regex.lastIndex);
        //console.log("  remainder: " + curBytes.substring(regex.lastIndex,regex.lastIndex + 10));
        var matchLen = matchArray[1].length;
        newBytes += curBytes.substring(0,regex.lastIndex - matchLen) + '"' +
          matchArray[1].substring(1) + '"';
        curBytes = curBytes.substring(regex.lastIndex - 1);
        regex.lastIndex = 0;
      }
      matchArray = regex.exec(curBytes);
    }
    newBytes += curBytes;

    return(newBytes);
  }


  //
  // getRawResultsFromBytes
  //
  // there's a lot of stuff coming back with query results, but we want only the
  // results themselves. With long numbers, we have to pull those results out of
  // the raw bytes without parsing them.
  //

  function findResult(buffer) {
    // the stuff coming back from the server is a JSON object: "{" followed by
    // quoted field names, ":", and a JSON value (which is recursive). Since we want
    // to find the results without parsing, find the "results: " key, then figure
    // out where it ends.

    var curLoc = 0;
    var whitespace = /\s/;
    var len = buffer.length;

    while (curLoc < len && whitespace.test(buffer.charAt(curLoc))) curLoc++; // ignore whitespace

    if (curLoc >= len && buffer.charAt(curLoc) != '{')
      return null; // expect object start
    else
      curLoc++;

    // loop through each field/value until we see a close brace

    while (curLoc < len) {
      // past the opening of the object, now look for quoted field names followed by ":"
      while (curLoc < len && whitespace.test(buffer.charAt(curLoc))) curLoc++; // ignore whitespace

      if (curLoc >= len || buffer.charAt(curLoc) != '"') // expect open quote
        return null; // expect field name start, otherwise we are done
      else
        curLoc++;

      var fieldStart = curLoc++;
      curLoc = moveToEndOfString(buffer,curLoc);
      if (curLoc >= len) return(null); //make sure we didn't go off the end

      var fieldName = buffer.substring(fieldStart,curLoc);
      //console.log("Got field: " + fieldName);

      var valueStart = curLoc + 3;
      curLoc = moveToEndOfValue(buffer,curLoc + 1); // start after close quote

      //console.log("raw: " + buffer.substring(fieldStart-1,curLoc-1));

      if (curLoc < len && fieldName == "results")
        return(buffer.substring(valueStart,curLoc-1));
    }
  }

  //
  // utility function to traverse strings, finding the end
  //

  function moveToEndOfString(buffer,curLoc) {
    while (curLoc < buffer.length) {     // loop until close quote
      var cur = buffer.charAt(curLoc);
      if (cur == '\\')
        curLoc += 2; // skip quoted characters
      else if (cur != '"')
        curLoc ++;
      else
        break;
    }
    return curLoc;
  }

  // utility function to find the end of a value, which might be an number, string,
  // object, or array, whose value ends with a comma or a close brace (marking
  // the end of everything)

  function moveToEndOfValue(buffer,curLoc) {
    // now parse the value, which might be an number, string, object, or array,
    // whose value ends with a comma or a close brace (marking the end of everything)

    var braceCount = 0;
    var bracketCount = 0;

    while (curLoc < buffer.length) {
      //console.log(curLoc + ": " + buffer.charAt(curLoc) + ", braces: " + braceCount + ", brackets: " + bracketCount);
      switch (buffer.charAt(curLoc++)){
      case '{': braceCount++; break;
      case '}': // if we're not inside an array or object, we're done
        if (braceCount == 0 && bracketCount == 0)
          return(curLoc);
        else
          braceCount--;
        break;
      case '[': bracketCount++; break;
      case ']': bracketCount--; break;
      case '"': curLoc = moveToEndOfString(buffer,curLoc) + 1; break;
      case ',':
        if (braceCount == 0 && bracketCount == 0)
          return(curLoc);
        break;
      default: // ignore other characters
      }
    }
    return(curLoc);
  }



  //
  //
  // all done creating the service, now return it
  //

  return qflns;
}
