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
              content = '<p class="error">' + data + '</p>';
            else if (data.data_not_cached)
              content = '<p class="error">' + JSON.stringify(data) + '</p>';

            // summarize plan
            if (data.analysis) {
              content += "<h3>Query Plan Summary:</h3>";
              content += '<br><ul class="cbui-plan-summary">';
              content += "<li>Indexes used: <ul>";
              for (var f in data.analysis.indexes)
                if (f.indexOf("#primary") >= 0)
                  content += '<li class="qw-field cbui-plan-expensive">' + f + '</li>';
                else
                  content += '<li class="qw-field">' + f + "</li>";
              content += "</ul></li>";

              content += "<li>Buckets<ul>";
              for (var b in data.analysis.buckets)
                content += "<li class='qw-field'>" + b + "</li>";
              content += "</ul></li>";

              content += "<li>Fields<ul>";
              for (var f in data.analysis.fields)
                content += "<li class='qw-field'>" + f + "</li>";
              content += "</ul></li>";
            }

            // Tabular plan
            if (data.plan_nodes) {
              //content += "<br><h3>Query Operator Data Flows (bottom to top):</h3><br>";
              //content += '<div class="ajtd-root ajtd-type-array">' +
              //makeHTMLtable(data.plan_nodes,"") + "</div>";

              // graphical plan
              //
              // map the plan to a data structure, the walk the structure, turning it into
              //

              content += '<br><br><h3>Visual Plan</h3><br>'
              content += '<div class="row qw-explain-wrapper"><div class="qw-node-wrapper qw-sequence flex-left qw-first-node">';
              content += makeTreeFromPlanNodes(data.plan_nodes);
              content += '</div></div>';
              //console.log("Visual tree: " + makeTree(transformedPlan));
            }
          }

          // set our element to use this HTML
          element.html(content);
        });
      }
    };
  });

  //
  // recursively turn the tree of ops into a graphical tree
  //

  function makeTreeFromPlanNodes(plan,hasSuccessor) {
    var result = '';

    var opName = plan.operator['#operator'] ? plan.operator['#operator'] : "unknown op";
    var opClass = "qw-node";

    // if we are at the end of the line, we need less padding
    if (!plan.predecessor && !plan.subsequence && !hasSuccessor)
     opClass += " qw-last-node";

    // we ignore operators of nodes with subsequences
    if (plan.subsequence)
      result += makeTreeFromPlanNodes(plan.subsequence,plan.predecessor);

    // if we have no predecessor, or we do and it's a single op, output our operator
    else if (!plan.predecessor || !_.isArray(plan.predecessor))
      result += '<div class="' + opClass + '" title="'
      + JSON.stringify(plan.operator).replace(/"/g,'\'') + '">'
      + getLabelForOperator(plan,'<br>')
      + '</div>';

    if (plan.predecessor)
     if (_.isArray(plan.predecessor)) {
        result += '</div><div class="cbui-row cbui-padding0 qw-combi-wrapper">';
        result += '<div class="qw-node qw-combinor">' + opName + "</div>";
        result += '<div class="qw-combinor-border"></div>';
        result += '<div class="qw-rows-wrapper">';

        for (var i = 0; i < plan.predecessor.length; i++) {
          result += '<div class="cbui-row cbui-padding0"><div class="qw-node-wrapper qw-sequence"><div class="qw-arrow-tip"></div>';
          result += makeTreeFromPlanNodes(plan.predecessor[i],hasSuccessor);
          result += '</div></div>';
        }

        result += '</div>';
      }
      else
        result += makeTreeFromPlanNodes(plan.predecessor,hasSuccessor);

    return(result);
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
      var transformedPlan = plan;

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
          result += '>' + getLabelForCell(array[col][row]) + '</td>';

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

  function getLabelForCell(entry) {
    if (!entry)
      return("");
    else if (_.isString(entry))
      return(entry);
    else if (entry.operator && entry.operator['#operator'])
      return(getLabelForOperator(entry));
    else
      return("");
  }

  //
  // given a node from a JSON plan, come up with an HTML label appropriate
  //

  function getLabelForOperator(node, separator) {
    if (!separator)
      separator = '';

    var label = "";

    // is it expensive?
    if (node.GetCostLevel() == 2)
      label = '<span class="cbui-plan-expensive">' + node.GetName() + '</span>' + separator;
    else
      label = node.GetName() + separator;

    // now add the details, if any
    var details = node.GetDetails();
    for (var i = 0; i < details.length; i++) {
      label += ' <span class="qw-field">' + details[i] + '</span>' + separator;
    }

    return(label);
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
    //console.log(" Putting item: " + plan.operator['#operator'] + " into position: " + curX + "," + curY);
    //console.log(" array[] length: " + array.length);
    //console.log(" array[curX] length: " + array[curX].length);
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


})();

