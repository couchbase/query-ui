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
  angular.module('qwExplainVizD3', []).directive('qwExplainVizD3', ['$compile', '$timeout', getD3Explain]);

  function getD3Explain($compile,$timeout) {
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
              content += '<a ng-click="topDown()"><span class="icon fa-caret-square-o-down fa-2x"></span></a>';
              content += '<a ng-click="leftRight()"><span class="icon fa-caret-square-o-right fa-2x"></span></a>';
              content += "</div>";

              content += "</div>";

              scope.topDown = topDown;
              scope.leftRight = leftRight;
            }

          }

          // set our element to use this HTML
          var header = angular.element(content);
          element.empty();
          $compile(header)(scope, function(compiledHeader) {element.append(compiledHeader)});

          //element.html(content);

          // now add the d3 content

          if (data.plan_nodes) {
            // put the SVG inside a wrapper to allow scrolling
            wrapperElement = angular.element('<div class="d3-tree-wrapper"></div>');
//            wrapperElement = angular.element('<div></div>');
            element.append(wrapperElement);
            simpleTree = makeSimpleTreeFromPlanNodes(data.plan_nodes,null,"null");
            
            // if we're creating the wrapper for the first time, allow a delay for it to get a size
            if ($('.d3-tree-wrapper').height()) 
              makeTree();
            else
              $timeout(makeTree,100);
          }
        });
      }
    };
  }

  //
  // global so we can rebuild the tree when necessary
  //

  var wrapperElement;
  var simpleTree; // underlying data

  function makeTree() {

    makeD3TreeFromSimpleTree(simpleTree);
  }

  //
  // handle zooming
  //

  function topDown() {changeOrient(orientTB);}
  function leftRight() {changeOrient(orientLR);}
  
  function changeOrient(newOrient) {
    wrapperElement.empty();
    orientation = newOrient;
    makeTree();
  }
 
  // handle drag/zoom events

  function zoom() {
    var scale = d3.event.scale,
        translation = d3.event.translate;
    //console.log("scale: " + JSON.stringify(scale));
    //console.log("translate: " + JSON.stringify(translation));
    d3.select(".drawarea")
        .attr("transform", "translate(" + translation + ")" +
              " scale(" + scale + ")");
  }

 

  //////////////////////////////////////////////////////////////////////////
  // make a d3 tree
  //

  // Magic numbers for layout
  var svg, g, zoomer;
  var svg_scale = 1.0;
  var lineHeight = 15;        // height for line of text, on which node height is based
  var interNodeXSpacing = 25; // spacing between nodes horizonally
  var interNodeYSpacing = 40; // spacing between nodes vertically

  var orientLR = 1,
  orientTB = 2;

  var orientation = orientTB;

  var width = 0; // total width for the SVG holding the tree
  var height = 0;// total height for the SVG holding the tree

  function makeD3TreeFromSimpleTree(root) {
    var duration = 500,
      i = 0;
    
    width = getTotalWidth(root,interNodeXSpacing);
    height = getTotalHeight(root,interNodeYSpacing);

    var canvas_width = $('.d3-tree-wrapper').width();
    var canvas_height =  $('.d3-tree-wrapper').height();
        
    //console.log("Svg width: " + canvas_width + ", height: " + canvas_height);
    //console.log("Got expected width: " + width + ", height: " + height);
        
    svg = d3.select(wrapperElement[0]).append('svg:svg')
        .attr("width", canvas_width)
        .attr("height", canvas_height)
        .attr("id", "outer_svg")
        .style("overflow", "scroll")
       .append("svg:g")
          .attr("class","drawarea")
          .attr("id", "svg_g")
      ;
    
    //    console.log("Got simple tree: " + JSON.stringify(root,null,2));

    // minimum fixed sizes for nodes, depending on orientation, to prevent overlap
    var minNodeSize = [125,lineHeight*6]; // for vertical
    if (orientation == orientLR)
      minNodeSize = [lineHeight*6,195];

    var tree = d3.layout.cluster()
    //.size([height, width])
    .nodeSize(minNodeSize)
    ;

    // use nice curves between the nodes
    var diagonal = d3.svg.diagonal().projection(getConnectionEndPoint);

    // assign nodes and links
    var nodes = tree.nodes(root);
    var links = tree.links(nodes);

    // We may override x/y locations due to Node width/height
    //nodes.forEach(function(d) { if (d.xOffset) d.y = d.xOffset; if (d.yOffset) d.y = d.yOffset;});
    var minX = canvas_width, maxX = 0, minY = canvas_height, maxY = 0;
    nodes.forEach(function(d) 
        {minX = Math.min(d.x,minX); minY = Math.min(d.y,minY); maxX = Math.max(d.x,maxX);maxY = Math.max(d.y,maxY);});
    //console.log("Actual width: " + (maxX - minX) + ", height: " + (maxY - minY));

    // to make a horizontal tree, x and y are swapped
    var vert = (orientation == orientTB);
    var dx = (vert ? maxX - minX : maxY - minY);
    var dy = (!vert ? maxX - minX : maxY - minY);
    var x = (vert ? (minX + maxX)/2 : (minY + maxY)/2);
    var y = (!vert ? (minX + maxX)/2 : (minY + maxY)/2);
    
    //var drawarea = d3.select("#outer_svg");
    //var bounds = drawarea.node().getBBox();
    //console.log("bounds2: " + bounds.width + ", " + bounds.height);
    var scale = Math.max(0.15,Math.min(2,.9 / Math.max(dx / canvas_width, dy / canvas_height)));
    
    var translate = [canvas_width / 2 - scale * x, canvas_height / 2 - scale * y];
    //console.log("Got new scale: " + scale + ", translate: " + JSON.stringify(translate));
    
    // set up zooming
    d3.select(".drawarea")
    .attr("transform","translate(" + translate + ")scale(" + scale + ")");

    zoomer = d3.behavior.zoom().scaleExtent([0.1, 2.5]).on("zoom", zoom);
    zoomer.translate(translate);
    zoomer.scale(scale);    

    d3.select("svg").call(zoomer);
    

    // Each node needs a unique id. If id field doesn't exist, use incrementing value
    var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
    .attr("class", "node")
    .attr("transform", getRootTranslation);

    // ********* create node style from data *******************
    nodeEnter.append("rect")
    .attr("width", function(d) {return getWidth(d);})
    .attr("height", function(d) {return getHeight(d);})
    .attr("rx", lineHeight) // sets corner roundness
    .attr("ry", lineHeight)
    .attr("x", function(d) {return(-1/2*getWidth(d))})
    .attr("y", function(d) {return getHeight(d)*-1/2}) // moving the object half its height centers the link lines
    .style("stroke", function(d) { return d.type; })
    .style("fill", function(d) { return d.level; });

    nodeEnter.append("text")
    //.attr("x", function(d) {return getWidth(d)*1/2})
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight})
    .attr("text-anchor", "middle")
    .text(function(d) { return d.name })
    .style("fill-opacity", 1e-6);

    // handle up to 3 lines of details
    for (var i=0;i<3;i++)
    nodeEnter.append("text")
    //.attr("x", function(d) {return getWidth(d)*1/2})
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight*(i+2)})
    .attr("text-anchor", "middle")
    .text(function(d) { return d.details[i] })
    .style("fill-opacity", 1e-6);

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", getNodeTranslation);

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

 
  //////////////////////////////////////////////////////////////////////////////////
  // layout/size functions that differ based on the orientation of the tree
  //

  function getConnectionEndPoint(node) {
    switch (orientation) {
    case orientTB:
      return [node.x, node.y];

    case orientLR:
    default:
      return [node.y, node.x];
    }
  }


  function getRootTranslation(root) {
    switch (orientation) {
    case orientTB:
      root.x0 = 50;
      root.y0 = 0;
      break;

    case orientLR:
    default:
      root.x0 = 50;
      root.y0 = 0;
      break;
    }

    return "translate(" + root.x0 + "," + root.y0 + ")";
  }

  function getNodeTranslation(node) {
    switch (orientation) {
    case orientTB:
      return "translate(" + node.x + "," + node.y + ")";

    case orientLR:
    default:
      return "translate(" + node.y + "," + node.x + ")";
    }
  }

  //
  // function to compute height for a given node based on how many lines
  // of details it has
  //

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
    if (node.name && node.name.length > maxWidth)
      maxWidth = node.name.length;
    if (node.details) for (var i=0; i < node.details.length; i++)
      if (node.details[i].length > maxWidth)
        maxWidth = node.details[i].length;

    return(maxWidth * 5); //allow 5 units for each character
  }

  //
  // recursively compute the total tree width.
  // For a horizonal tree, it is the maximum width of the children, plus our own width
  // For a vertical tree, it is the width of all our child branches, plus our own width
  //

  function getTotalWidth(node,widthSoFar) {
    delete node.xOffset; // make sure these aren't left over from previous orientations
    delete node.yOffset;

    var curWidth = getWidth(node);
    //console.log("For node: " + node.name + " got cur: " + curWidth + ", children: " + node.children);
    if (!node)
      return(curWidth);

    switch (orientation) {
    case orientLR:
      var maxChildWidth = 0;
      node.xOffset = widthSoFar;

      if (node.children) for (var i=0; i<node.children.length; i++) {
        var cWidth = getTotalWidth(node.children[i],widthSoFar+curWidth+interNodeXSpacing*2);
        if (cWidth > maxChildWidth)
          maxChildWidth = cWidth;
      }

      return getWidth(node) + interNodeXSpacing + maxChildWidth;

    case orientTB:
    default:
      var totalChildWidth = 0;

      // we might have zero children, one child, or two children.
        if (!node.children || node.children.length == 0)      // our width alone
          return(curWidth);
        else if (node.children.length == 1) // maxiumum of our width or the child's width
          return(Math.max(curWidth,getTotalWidth(node.children[0])));
        else if (node.children.length == 2) // our width plus width of each child tree
          return(curWidth + getTotalWidth(node.children[0]) + getTotalWidth(node.children[1]));
    }
  }

  //
  // recursively compute the height of the tree.
  // In a horizontal tree, this is the maxiumum height of each branch, plus interNodeSpacing between branches
  // In a vertical tree, this is our height, plus the maximum height of any children
  //

  function getTotalHeight(node,heightSoFar) {
    var curHeight = getHeight(node); // assume max height is our height
    if (!node)
      return(curHeight);

    switch (orientation) {
    case orientLR:

      var childHeightSum = 0;
      if (node.children) for (var i=0; i<node.children.length; i++) {
        childHeightSum += getTotalHeight(node.children[i]);
      }

      // if only one child, our max height is the max of child size vs our size
      if (!node.children || node.children.length == 0)
        return(curHeight);
      else if (node.children.length == 1)
        return(Math.max(curHeight,childHeightSum));
      // for multiple children, height is the sum of heights
      else
        return(curHeight + childHeightSum + interNodeYSpacing);

    case orientTB:
    default:
      var maxHeight = curHeight;
      var maxChildHeight = 0;
      node.yOffset = heightSoFar;

      // see if we have any children, and what the max height is for them
      if (node.children) for (var i=0; i<node.children.length; i++) {
        var childH = getTotalHeight(node.children[i],heightSoFar + curHeight + interNodeYSpacing);
        if (childH > maxChildHeight)
          maxChildHeight = childH;
      }

      if (maxChildHeight > 0)
        return curHeight + interNodeYSpacing + maxChildHeight;
      else
        return curHeight;
    }
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
