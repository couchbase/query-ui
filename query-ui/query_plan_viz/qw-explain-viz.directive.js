/**
 * Angular directive to convert JSON into HTML tree. Inspired by Brian Park's
 * MIT Licensed "angular-json-human.js" which turns JSON to HTML tables.
 *
 *  Extended for trees by Eben Haber at Couchbase.
 *
 *  This class takes a JS object or JSON string, and displays it as an HTML
 *  table. Generally, it expects an array of something. If it's an array of objects,
 *  then each row corresponds to one object, and the columns are the union of all
 *  fields of the objects. If an object doesn't have a field, that cell is blank.
 *
 *
 *  , which object members indented. This is similar to pretty-printing
 *  JSON, but is more compact (no braces or commas), and permits using colors
 *  to highlight field names vs. values, and one line from the next.
 *
 *  For usage, see the header to qw-json-table.
 */
/* global _, angular */
(function() {

  'use strict';
  angular.module('qwExplainViz', []).directive('qwExplainViz', function () {
    return {
      restrict: 'A',
      scope: { data: '=qwExplainViz' },
      template: '<div></div>',
      link: function (scope, element) {

        scope.$watch('data', function (data) {
          // start with an empty div, if we have data convert it to HTML
          var content = "<div>{}</div>";
          if (data) {
            //console.log("Got data: " + JSON.stringify(data));
            content = "";

            if (_.isString(data))
              content = "<h3>" + data + "</h3>";
            else if (data.data_not_cached)
              content = "<h3>" + JSON.stringify(data) + "</h3>";

            // summarize plan
            if (data.analysis) {
              content += "<h3>Query Plan Summary:</h3>";
              content += "<br><ul class=\"cbui-plan-summary\">";

              content += "<li>Indexes used: <ul>";
              for (var f in data.analysis.indexes)
                if (f.indexOf("#primary") >= 0)
                  content += "<li class='qw-field cbui-plan-expensive'>" + f + "</li>";
                else
                  content += "<li class='qw-field'>" + f + "</li>";
              content += "</ul></li>";

              content += "<li>Buckets used: <ul>";
              for (var b in data.analysis.buckets)
                content += "<li class='qw-field'>" + b + "</li>";
              content += "</ul></li>";

              content += "<li>Fields used: <ul>";
              for (var f in data.analysis.fields)
                content += "<li class='qw-field'>" + f + "</li>";
              content += "</ul></li>";

              content += "</ul><br>";
            }

            if (data.explain && (data.explain.plan || _.isString(data.explain.plan))) {
              content += "<br><h3>Query Operator Data Flows (bottom to top):</h3><br>";
              content += '<div class="ajtd-root ajtd-type-array">' +
              makeHTMLtable(data.explain,"") + "</div>";
            }
          }

          // set our element to use this HTML
          element.html(content);
        });
      }
    };
  });

  function printPlan(plan, indent) {
    var result = '';
    for (var i = 0; i < indent; i++)
      result += ' ';
    var opName = plan.operator['#operator'];
    result += opName ? opName : "unknown op";
    console.log(result);

    if (plan.subsequence)
      printPlan(plan.subsequence,indent + 2);

    if (plan.predecessor)
      if (_.isArray(plan.predecessor)) for (var i = 0; i < plan.predecessor.length; i++) {
        result = '';
        for (var j = 0; j < indent+2; j++)
          result += ' ';
        console.log(result + "branch " + i)
        printPlan(plan.predecessor[i],indent + 4);
      }
      else
        printPlan(plan.predecessor,indent);
  }

  //
  // We need to take the query plan, which is a somewhat arbitrary tree-like
  // structure and turn it into more of a data-flow tree, suitable for showing
  // in the UI as an HTML table
  //


  var makeHTMLtable = function(plan) {
    var result = '';

    result += '<table class="ajtd-root ajtd-object-value ajtd-value single-type-array"><tbody>';

    if (_.isString(plan))
      result += '<tr><td>' + plan + '</td></tr>';

    else if (plan) {
      var transformedPlan = analyzePlan(plan.plan,null);

      var depth = transformedPlan.Depth();
      var width = transformedPlan.BranchCount();
      //console.log("Got plan depth: " + transformedPlan.Depth() + ", width: " + transformedPlan.BranchCount());
      //printPlan(transformedPlan,2);

      // build a 2D array holding the elements of the processed plan to then build the table
      var array = [];
      for (var col = 0; col < width; col++) {
        var c = [];
        for (var row = 0; row < depth; row++)
          c.push("");
        array.push(c);
      }

      //
      //putPlanInArray(array,transformedPlan,width-1,depth-1);
      putPlanInArray(array,transformedPlan,0,0);

      for (var row = 0; row < depth; row++) {
        result += '<tr>';
        for (var col = 0; col < width; col++) {
          var cell = array[col][row];

          // start with a blank cell to break up the cell border lines
          result += '<td class="';

          if (cell.union && !cell.unionText)
            result += 'qw-union ';
          if (cell.parallel)
            result += 'qw-parallel ';
          if (cell.parallelBegin)
            result += 'qw-parallel-begin ';
          if (cell.parallelEnd)
            result += 'qw-parallel-end ';

          result += '"> </td>';

          // style the cell based on whether it's part of a parallel block, or a union
          result += '<td class="cbui-explain-table ';

          if (cell.union)
            result += 'qw-union ';
          if (cell.unionText)
            result += 'qw-union-text ';
          if (cell.unionChild)
            result += 'qw-union-child ';

          result += '"';

          // done with style, add a tool tip with more details
          if (array[col][row].operator) {
            var op = array[col][row].operator;
            // for UnionAll, remove the "children" so the tool tip doesn't have everything
            if (op['#operator'] === 'UnionAll') {
              op = _.clone(op);
              delete op.children;
            }

            result += ' title="' + JSON.stringify(op).replace(/"/g,'\'') + '"';
          }

          // and, of course, the actual content of the cell, a label
          result += '>' + getLabelForArrayEntry(array[col][row]) + '</td>';

          // one more blank cell to keep union lines from running in to parallel lines

          result += '<td class="';

          if (cell.union && !cell.unionChild)
            result += 'qw-union ';

          result += '">&nbsp</td>';

        }
        result += '</tr>';
        //if (row == 0)
        //  console.log("Got table html first row: " + result);
      }
    }

    result += '</tbody></table>';

    //console.log("Got table html: " + result);
    return(result);
  };

  //
  //
  //

  function getLabelForArrayEntry(entry) {
    if (!entry)
      return("");
    else if (_.isString(entry))
      return(entry);
    else if (entry.operator && entry.operator['#operator']) {
      var pNode = entry.operator;
      var opName = pNode['#operator'];
      if (opName === "IndexScan")
        return(opName + ' <span class="qw-field">' + pNode.keyspace + "." + pNode.index + '</span>');
      else if (opName === "PrimaryScan")
        return('<span class="cbui-plan-expensive">' + opName + ' <span class="qw-field">' + pNode.keyspace  + '</span></span>');
      else if (opName === "InitialProject")
        return(opName + ' <span class="qw-field">' + pNode.result_terms.length + " terms" + '</span>');
      else if (opName === "Fetch")
        return(opName + ' <span class="qw-field">' + pNode.keyspace + (pNode.as ? " as "+pNode.as : "")  + '</span>');
      else if (opName === "Alias")
        return(opName + ' <span class="qw-field">' + pNode.as  + '</span>');
      else if (opName === "Limit" || opName == "Offset")
        return(opName + ' <span class="qw-field">' + pNode.expr  + '</span>');
      else if (opName === "Join")
        return(opName + ' <span class="qw-field">' + pNode.keyspace + (pNode.as ? " as "+pNode.as : "") + ' on '
            + pNode.on_keys + '</span>');
      else if (opName === "Order") {
        var result = opName + ' <span class="qw-field">';
        if (pNode.sort_terms) for (var i = 0; i < pNode.sort_terms.length; i++)
          result += pNode.sort_terms[i].expr + " ";
        result +=  '</span>';
        return(result);
      }
      else if (opName == "Distinct")
        return('<span class="cbui-plan-expensive">' + opName + '</span>');

      else
        return(opName);
    }
    else
      return("");
  }


  //
  // Once we have the tree structure of operators, we want to convert that tree into
  // an array that can be used to fill in an HTML table
  //

  function putPlanInArray(array,plan,curX,curY) {
    var ourDepth = 1;

    // do we have a multi-step subsequence?
    if (plan.subsequence) {
      ourDepth = plan.subsequence.Depth();
      putPlanInArray(array,plan.subsequence,curX,curY);
    }

    // just one op
    else {
//    console.log(" Putting item: " + plan.operator['#operator'] + " into position: " + curX + "," + curY);
//    console.log(" array[] length: " + array.length);
//    console.log(" array[curX] length: " + array[curX].length);
      array[curX][curY] = plan; // put the name in
    }

    // if no predecessor, nothing more to do
    if (!plan.predecessor)
      return;

    // if we have a single predecessor, make a recursive call
    else if (!_.isArray(plan.predecessor))
      putPlanInArray(array,plan.predecessor,curX,curY+ourDepth);

    // if we have an array of predecessors, make a recursive call for each, placing each in a
    // different column
    else {
      array[curX][curY].union = true;
      array[curX][curY].unionText = true;
      var childX = curX;
      //console.log("Starting union at: " + curX + "," + curY + ", pred len: " + plan.predecessor.length);
      //var prevChildX = curX;

      // iterate over the children we are unioning
      for (var i = 0; i < plan.predecessor.length; i++) {
        //console.log("  Got childX: " + childX + ", and branch count: " + plan.predecessor[i].BranchCount());
        // add the child to the array
        putPlanInArray(array,plan.predecessor[i],childX,curY+ourDepth);

        // if there are any gaps between this child and the next, fill in with union line
        if (i < plan.predecessor.length - 1)
          for (var c = childX + 1; c < childX + plan.predecessor[i].BranchCount(); c++) {
            //console.log('   setting union for: ' + c + "," + curY);
            array[c][curY] = {union: true, operator: ""};
          }

        // for subsequent children, add marks to indicate union parentage
        if (i > 0) {
          // here is the box right above the child
          array[childX][curY] = {union: true, unionChild: true, operator: ""};
          // fill in any gaps between current child and previous child
//          for (var c = prevChildX - 1; c > childX; c--)
          //prevChildX = childX;
        }

        // the next child may be displaced by many rows if we have many branches
        childX = childX + plan.predecessor[i].BranchCount();
      }
    }
  }

  //
  // code for analyzing explain plans. A plan is an object with an "#operator" field, and possibly
  // other fields depending on the operator, some of the fields may indicate child operators
  //

  function PlanNode(predecessor, operator, subsequence) {
    this.predecessor = predecessor; // might be an array if this is a Union node
    this.operator = operator;       // object from the actual plan
    this.subsequence = subsequence; // for parallel ops, arrays of plan nodes done in parallel
  }

  // how 'wide' is our plan tree?
  PlanNode.prototype.BranchCount = function() {
    if (this.predecessor == null)
      return(1);
    else if (!_.isArray(this.predecessor))
      return(this.predecessor.BranchCount());
    else {
      var count = 0;
      for (var i=0; i < this.predecessor.length; i++)
        count += this.predecessor[i].BranchCount();
      return(count);
    }
  }

  // how 'deep' is our plan tree?
  PlanNode.prototype.Depth = function() {
    var ourDepth = this.subsequence ? this.subsequence.Depth() : 1;

    if (this.predecessor == null)
      return(ourDepth);
    else if (!_.isArray(this.predecessor))
      return(ourDepth + this.predecessor.Depth());
    else {
      var maxPredDepth = 0;
      for (var i=0; i < this.predecessor.length; i++)
        if (this.predecessor[i].Depth() > maxPredDepth)
          maxPredDepth = this.predecessor[i].Depth();

      return(maxPredDepth + 1);
    }
  }

  var explainFields = {};

  //
  // analyzePlan
  //
  // We need to take the query plan, which is a somewhat arbitrary tree-like
  // structure and turn it into more of a data-flow tree of PlanNodes, where
  // the root of the tree is the final output of the query, and the root's
  // children are those operators that feed data in to the result, all the way
  // back to the leaves which are the original data scans.
  //

  function analyzePlan(plan, predecessor) {

    // sanity check
    if (_.isString(plan))
      return(null);

    //console.log("Inside analyzePlan");

    // iterate over fields, look for "#operator" field
    var operatorName;
    var fields = [];

    _.forIn(plan,function(value,key) {
      if (key === '#operator')
        operatorName = value;

      var type;
      if (_.isString(value)) type = 'string';
      else if (_.isArray(value)) type = 'array';
      else if (_.isObject(value)) type = 'object';
      else if (_.isNumber(value)) type = 'number';
      else if (_.isNull(value)) type = 'null';
      else type = 'unknown';

      var field = {};
      field[key] = type;
      fields.push(field);
    });

    // at this point we should have an operation name and a field array

    //console.log("  after analyze, got op name: " + operatorName);

    // we had better have an operator name at this point

    if (!operatorName) {
      console.log("Error, no operator found for item: " + JSON.stringify(plan));
      return(null);
    }

    // if we have a sequence, we analyze the children and append them to the predecessor
    if (operatorName === "Sequence" && plan['~children']) {
      for (var i = 0; i < plan['~children'].length; i++)
        predecessor = analyzePlan(plan['~children'][i],predecessor);

      return(predecessor);
    }

    // parallel groups are like sequences, but they need to wrap their child to mark it as parallel
    else if (operatorName === "Parallel" && plan['~child']) {
      var subsequence = analyzePlan(plan['~child'],null);
      // mark the elements of a parallel subsequence for later annotation
      for (var subNode = subsequence; subNode != null; subNode = subNode.predecessor) {
        if (subNode == subsequence)
          subNode.parallelBegin = true;
        if (subNode.predecessor == null)
          subNode.parallelEnd = true;
        subNode.parallel = true;
      }
      return(new PlanNode(predecessor,plan,subsequence));
    }

    // UNION operators will have an array of predecessors drawn from their "children".
    // we expect predecessor to be null if we see a UNION
    else if ((operatorName == "Union" || operatorName === "UnionAll") && plan['children']) {
      if (predecessor != null)
        console.log("ERROR: Union with unexpected predecessor: " + JSON.stringify(predecessor));

      var unionChildren = [];

      for (var i = 0; i < plan['children'].length; i++)
        unionChildren.push(analyzePlan(plan['children'][i],null));

      return(new PlanNode(unionChildren,plan));
    }

    // Similar to UNIONs, IntersectScan, UnionScan group a number of different scans
    // have an array of 'scan' that are merged together

    else if ((operatorName == "UnionScan") || (operatorName == "IntersectScan")) {
      var scanChildren = [];

      for (var i = 0; i < plan['scans'].length; i++)
        scanChildren.push(analyzePlan(plan['scans'][i],null));

      return(new PlanNode(scanChildren,plan));
    }

    // for all other operators, create a plan node
    else {
      return(new PlanNode(predecessor,plan));
    }


//  if (!explainFields[operatorName]) // have we seen the operator before?
//  explainFields[operatorName] = fields;

//  else for (var f = 0; f < fields.length; f++) {
//  var found = false;

//  for (var ef = 0; ef < explainFields[operatorName].length; ef++) {
//  //console.log("  comparing: " + JSON.stringify(fields[f]) + " to " + JSON.stringify(explainFields[operatorName][ef]));
//  if (_.isEqual(fields[f],explainFields[operatorName][ef])) {
//  //console.log("   Found!");
//  found = true;
//  break;
//  }
//  }
//  if (!found)
//  explainFields[operatorName].push(fields[f]);
//  }

  }

  function logFields() {
    console.log("Found explain fields: ");
    _.forIn(explainFields, function(value, key) {
      console.log('    ' + key + " - " + JSON.stringify(value));
    });
  }


})();

