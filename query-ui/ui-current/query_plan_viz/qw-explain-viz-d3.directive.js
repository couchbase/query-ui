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
  angular.module('qwExplainVizD3', []).directive('qwExplainVizD3', function () {
    return {
      restrict: 'A',
      scope: { data: '=qwExplainVizD3' },
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

            // summarize plan in panel at the top
            if (data.analysis) {
              content += "<div class='row items-top qw-explain-summary indent-1'>";
              content += "<div class='column'>";
              content += "<h5>Indexes</h5>";
//              content += "<li>Indexes used: <ul>";
              for (var f in data.analysis.indexes)
                if (f.indexOf("#primary") >= 0)
                  content += "<em class='cbui-plan-expensive'>" + f + "</em>&nbsp;&nbsp; ";
                else
                  content += "<em>" + f + "</em>&nbsp;&nbsp; ";
              content += "</div>";

              content += "<div class='column'>";
              content += "<h5>Buckets</h5>";
              for (var b in data.analysis.buckets)
                content += "<em>" + b + "</em>&nbsp;&nbsp; ";
              content += "</div>";

              content += "<div class='column'>";
              content += "<h5>Fields</h5>";
              for (var f in data.analysis.fields)
                content += "<em>" + f + "</em>&nbsp;&nbsp; ";
              content += "</div>";


              content += "<div class='column text-right nowrap'>";
              content += '<a onclick="$(\'.qw-explain-wrapper\').removeClass(\'qw_zoom_1\');$(\'.qw-explain-wrapper\').addClass(\'qw_zoom_2\');$(\'.qw-explain-wrapper\').scrollLeft(4000)"><span class="icon fa-search"></span></a>';
              content += '<a onclick="$(\'.qw-explain-wrapper\').addClass(\'qw_zoom_1\');$(\'.qw-explain-wrapper\').removeClass(\'qw_zoom_2\');$(\'.qw-explain-wrapper\').scrollLeft(4000)"><span class="icon fa-search fa-1-5x"></span></a>';
              content += '<a onclick="$(\'.qw-explain-wrapper\').removeClass(\'qw_zoom_1\');$(\'.qw-explain-wrapper\').removeClass(\'qw_zoom_2\');$(\'.qw-explain-wrapper\').scrollLeft(4000)"><span class="icon fa-search fa-2x"></span></a>';
              content += "</div>";

              content += "</div>";
            }
            
          }

          // set our element to use this HTML
          element.html(content);
          
          // now add the d3 content
          
          if (data.plan_nodes) {
            // put the SVG inside a wrapper to allow scrolling
            var wrapperElement = angular.element('<div class="data-table-wrapper"></div>');
            element.append(wrapperElement);

            var simpleTree = makeSimpleTreeFromPlanNodes(data.plan_nodes,null,"null");
            simpleTree.x0 = 50;
            simpleTree.y0 = 0;
            makeD3TreeFromSimpleTree(wrapperElement,simpleTree);
            //makeD3TreeFromSimpleTree(element,treeData);
          }
        });
      }
    };
  });

  var treeData =
    { "x0" : 0,
      "y0" : 100,
      "name": "Stream",
      "time": " 00:00",
      "type": "#000",
      "level": "#ccc",
      "value": "5",
      "parent": "null",
      "children": [
        {
          "name": "Level 2: A",
          "time": "00:00",
          "type": "#f5a623", // orange-1 : warning : stroke
          "level": "#4287d6", // blue-1 : has-children : fill
          "value": "10", // radius
          "parent": "Stream",
          "children": [
            {
              "name": "Son of A",
              "time": "00:00",
              "type": "#000",
              "level": "#ccc",
              "value": "5",
              "parent": "Level 2: A",
              "children": [
                {
                  "name": "Son of son of A",
                  "time": "00:00",
                  "type": "#000",
                  "level": "#ccc",
                  "value": "5",
                  "parent": "Son of A"
                }
              ]
            },
            {
              "name": "Daughter of A",
              "time": "00:00",
              "type": "#000",
              "level": "#ccc",
              "value": "5",
              "parent": "Level 2: A"
            }
          ]
        },
        {
          "name": "Level 2: B",
          "time": "00:00",
          "type": "#000",
          "level": "#ccc",
          "value": "5",
          "parent": "Top Level"
        }
      ]
    }
  ;
  
  //
  // make a d3 tree
  
  function makeD3TreeFromSimpleTree(element,root,svg) {
    var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = getTotalWidth(root,interNodeSpacing),
    height = getTotalHeight(root),
    duration = 750,
    i = 0;
    
    var svg = d3.select(element[0]).append('svg')
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom);

    console.log("Got simple tree: " + JSON.stringify(root,null,2));

    var tree = d3.layout.tree().size([height, width]);

    // use nice curves between the nodes
    var diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });

    // add a group element to hold the nodes, text, and links
    svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
    // assign nodes and links
    var nodes = tree.nodes(root).reverse();
    var links = tree.links(nodes);
    
    // Normalize for fixed-depth.
    nodes.forEach(function(d) { d.y = d.xOffset; });
    
    // Each node needs a unique id. If id field doesn't exist, use incrementing value
    var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
    .attr("class", "node")
    .attr("transform", function(d) { return "translate(" + root.y0 + "," + root.x0 + ")"; })
    ;//.on("click", click);

    // ********* create node style from data *******************
    nodeEnter.append("rect")
    .attr("width", function(d) {return getWidth(d);})
    .attr("height", function(d) {return getHeight(d);})
    .attr("rx", lineHeight) // sets corner roundness
    .attr("ry", lineHeight)
    .attr("y", function(d) {return getHeight(d)*-1/2}) // moving the object half its height centers the link lines
    .style("stroke", function(d) { return d.type; })
    .style("fill", function(d) { return d.level; });

    nodeEnter.append("text")
    //.attr("x", function(d) { return d.children || d._children ? -14 : 14 })
    .attr("x", function(d) {return getWidth(d)*1/2})
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight})
    .attr("text-anchor", "middle")
    .text(function(d) { return d.name })
    .style("fill-opacity", 1e-6);

    // handle up to 3 lines of details
    for (var i=0;i<3;i++)
    nodeEnter.append("text")
    //.attr("x", function(d) { return d.children || d._children ? -14 : 14 })
    .attr("x", function(d) {return getWidth(d)*1/2})
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight*(i+2)})
    .attr("text-anchor", "middle")
    .text(function(d) { return d.details[i] })
    .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
    .duration(duration)
    .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.selectAll("text").style("fill-opacity", 1);

    //Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
    .duration(duration)
    .attr("transform", function(d) { return "translate(" + root.y + "," + root.x + ")"; })
    .remove();

    nodeExit.select("rect")
    .attr("r", 1e-6);

    nodeExit.selectAll("text")
    .style("fill-opacity", 1e-6);

    // Update the links…
    var link = svg.selectAll("path.link")
    .data(links, function(d) { return d.target.id; });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
    .attr("class", "link")
    // .style("stroke", function(d) { return d.target.level; }) // color line with level color
    .attr("d", function(d) {
      var o = {x: root.x0, y: root.y0};
      return diagonal({source: o, target: o});
    });

    // Transition links to their new position.
    link.transition()
    .duration(duration)
    .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
    .duration(duration)
    .attr("d", function(d) {
      var o = {x: root.x, y: root.y};
      return diagonal({root: o, target: o});
    })
    .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });


  }
  
  //
  // function to compute height for a given node based on how many lines
  // of details it has
  //
  
  var lineHeight = 20;
  
  function getHeight(node) {
    var numLines = 2;
    if (node.details)
      numLines += node.details.length;
    return(lineHeight*numLines);
  } 
  
  //
  // compute width by finding the longest line, counting characters
  //
  
  function getWidth(node) {
    var maxWidth = 20; // leave at least this much space
    if (node.name.length > maxWidth)
      maxWidth = node.name.length;
    for (var i=0; i < node.details.length; i++)
      if (node.details[i].length > maxWidth)
        maxWidth = node.details[i].length;
    
    return(maxWidth * 5); //allow 5 units for each character
  }

  //
  // recursively compute the total tree width, which is the maximum width of the children,
  // plus our own width
  //
  
  var interNodeSpacing = 20;
  
  function getTotalWidth(node,widthSoFar) {
    var maxChildWidth = 0;
    var curWidth = getWidth(node);
    node.xOffset = widthSoFar;
    
    for (var i=0; i<node.children.length; i++) {
      var cWidth = getTotalWidth(node.children[i],widthSoFar+curWidth+interNodeSpacing);
      if (cWidth > maxChildWidth)
        maxChildWidth = cWidth;
    }
    
    return getWidth(node) + interNodeSpacing + maxChildWidth;      
  }
  
  //
  // compute the height of the tree. In the horizontal orientation, this is the maxiumum height
  // of each branch, plus interNodeSpacing between branches
  //
  
  function getTotalHeight(node) {
    var curHeight = getHeight(node); // assume max height is our height
    
    var childHeightSum = 0;
    for (var i=0; i<node.children.length; i++) {
      childHeightSum += getTotalHeight(node.children[i]);
    }

    // if only one child, our max height is the max of child size vs our size
    if (node.children.length == 0)
      return(curHeight);
    else if (node.children.length == 1)
      return(Math.max(curHeight,childHeightSum));
    // for multiple children, height is the sum of heights
    else
      return(curHeight + childHeightSum + interNodeSpacing*2); 
  }
  
  //
  // recursively turn the tree of ops into a simple tree to give to d3
  //

  function makeSimpleTreeFromPlanNodes(plan,next,parent) {
    // we ignore operators of nodes with subsequences, and put in the subsequence 
    if (plan.subsequence)
      return(makeSimpleTreeFromPlanNodes(plan.subsequence,plan.predecessor,parent));

    if (!plan || !plan.operator)
      return(null);
    
    // otherwise build a node based on this operator
    var opName = (plan && plan.operator && plan.operator['#operator'])
      ? plan.operator['#operator'] : "unknown op";
      
    var result = {
        name: plan.GetName(),
        details: plan.GetDetails(),
        parent: parent,
        children: [],
        level: "#ccc", // default background color
        time: plan.time,
        time_percent: plan.time_percent
    };
    
    // how expensive are we? Color background by cost, if we know
    if (plan && plan.time_percent) {
      if (plan.time_percent >= 20) 
        result.level = "#f9ca7b";
      else if (plan.time_percent >= 5)  
        result.level = "#fbebd7";
      else if (plan.time_percent >= 1)  
        result.level = "#fdedd3";
    }

    // if the plan has a 'predecessor', it is either a single plan node that should be
    // our child, or an array marking multiple children
    
    if (plan.predecessor)
      if (!_.isArray(plan.predecessor))
        result.children.push(makeSimpleTreeFromPlanNodes(plan.predecessor,next,result.name));
      else for (var i=0; i< plan.predecessor.length; i++)
        result.children.push(makeSimpleTreeFromPlanNodes(plan.predecessor[i],null,result.name));
        
    return(result);
  }

})();
