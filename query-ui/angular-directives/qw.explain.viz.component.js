/**
 * Angular directive that takes a query plan data structure and renders it as
 * a D3 graph.
 */
/* global _, angular */

import { ViewEncapsulation,
         ChangeDetectionStrategy,
         Component,
         ElementRef,
         NgModule,
         Renderer2 } from '/ui/web_modules/@angular/core.js';
import { MnLifeCycleHooksToStream } from '/ui/app/mn.core.js';

import { CommonModule } from '/ui/web_modules/@angular/common.js';

import _ from "/ui/web_modules/lodash.js";

import {select as d3Select, event as d3Event} from "/ui/web_modules/d3-selection.js";
import {linkVertical as d3LinkVertical,
        linkHorizontal as d3LinkHorizontal} from "/ui/web_modules/d3-shape.js";

import {transition as d3Transition} from "/ui/web_modules/d3-transition.js";
import {interpolate as d3Interpolate} from "/ui/web_modules/d3-interpolate.js";
import {cluster as d3Cluster, tree as d3Tree} from "/ui/web_modules/d3-hierarchy.js";
import {zoom as d3Zoom, zoomIdentity as d3ZoomIdentity} from "/ui/web_modules/d3-zoom.js";
import {hierarchy as d3Hierarchy} from "/ui/web_modules/d3-hierarchy.js";


export { QwExplainViz };

class QwExplainViz extends MnLifeCycleHooksToStream {
  static get annotations() { return [
    new Component({
      selector: "[qwExplainViz]",
      templateUrl: "../_p/ui/query/angular-directives/qw.explain.viz.template.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      encapsulation: ViewEncapsulation.None,
      imports: [ CommonModule ],
      inputs: [
        "qwExplainViz"
        ],
        changeDetection: ChangeDetectionStrategy.OnPush
    })
    ]}

  static get parameters() { return [ElementRef, Renderer2] }

  constructor(element, renderer) {
    super();
    this.element = element;
    this.renderer = renderer;
  }

  ngOnInit() {
    //console.log("Directive ngOnInit, input: " + this.qwExplainViz);
    this.data = this.qwExplainViz;
    this.dataIsString = _.isString(this.data);
    this.dataIsArray = _.isArray(this.data);
    if (_.isPlainObject(this.data.analysis.indexes))
      this.data.analysis.indexes = Object.keys(this.data.analysis.indexes);
    if (_.isPlainObject(this.data.analysis.buckets))
      this.data.analysis.buckets = Object.keys(this.data.analysis.buckets);
    if (_.isPlainObject(this.data.analysis.fields))
      this.data.analysis.fields = Object.keys(this.data.analysis.fields);
    this.topDown = topDown;
    this.leftRight = leftRight;
    this.bottomTop = bottomTop;
    this.rightLeft = rightLeft;

    this.orientIs = function(val) {return queryService.query_plan_options.orientation == val;};

    this.zoomIn = zoomIn;
    this.zoomOut = zoomOut;
  }

  ngAfterViewInit() {
    //console.log("Directive ngAfterInit, input: " + this.qwJsonDataTable2);
    outerElement = this.element.nativeElement.querySelector('.wb-results-explain');
    wrapperElement = this.element.nativeElement.querySelector('.wb-explain-d3-wrapper');
    simpleTree = makeSimpleTreeFromPlanNodes(this.data.plan_nodes,null,"null");
    makeTree(this.element.nativeElement);
  }
}

//
// global so we can rebuild the tree when necessary
//

var queryService = {
    query_plan_options: {
      orientation: orientLR
    }
};
var outerElement;
var wrapperElement;
var simpleTree; // underlying data

function makeTree(element) {

  makeD3TreeFromSimpleTree(simpleTree,element);
}

//
// handle zooming
//

var orientLR = 1;
var orientTB = 2;
var orientRL = 3;
var orientBT = 4;

function topDown() {changeOrient(orientTB);}
function bottomTop() {changeOrient(orientBT);}
function leftRight() {changeOrient(orientLR);}
function rightLeft() {changeOrient(orientRL);}

function changeOrient(newOrient) {
  wrapperElement.empty();
  queryService.query_plan_options.orientation = newOrient;
  makeTree();
}

// handle drag/zoom events

function zoom() {
  svg.attr("transform", d3Event.transform);
}

function zoomIn()  {zoomButton(false);}
function zoomOut() {zoomButton(true); }

function zoomButton(zoom_in) {
  if (zoom_in)
    d3Select('.wb-explain-d3-wrapper').transition().call(zoomer.scaleBy,2);
  else
    d3Select('.wb-explain-d3-wrapper').transition().call(zoomer.scaleBy,0.5);
}

//////////////////////////////////////////////////////////////////////////
// make a d3 tree
//

// Magic numbers for layout
var svg, g, zoomer;
var svg_scale = 1.0;
var lineHeight = 15;        // height for line of text, on which node height is based
var minNodeWidthVert = 155; // horizontal spacing for vertical trees
var minNodeWidth = 225;     // horizontal spacing for horizontal trees

var canvas_width, canvas_height;

function makeD3TreeFromSimpleTree(root, element) {
  var duration = 500,
      i = 0;
  var vert = (queryService.query_plan_options.orientation == orientTB ||
              queryService.query_plan_options.orientation == orientBT);

  canvas_width = wrapperElement.clientWidth;
  canvas_height =  wrapperElement.clientHeight - 40;

  svg = d3Select('.wb-explain-d3-wrapper').append('svg:svg')
    .attr("width", "100%")
    .attr("height", "100%")
    .style("overflow", "scroll")
    .on("click",removeAllTooltips)

    .append("svg:g")
    .attr("class","drawarea")
    .attr("id", "svg_g")
    ;

  const trans = svg.transition().duration(duration);

  // need a definition for arrows on lines
  var arrowhead_refX = vert ? 0 : 0;
  var arrowhead_refY = vert ?  2 : 2;

  svg.append("defs").append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 0 10 12")
    .attr("refX", arrowhead_refX) /*must be smarter way to calculate shift*/
    .attr("refY", arrowhead_refY)
    .attr("markerWidth", 20)
    .attr("markerHeight", 20)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M 6 0 V 4 L 0 2 Z"); //this is actual shape for arrowhead

  // minimum fixed sizes for nodes, depending on orientation, to prevent overlap
  var minNodeSize = vert ? [minNodeWidthVert,lineHeight*7] : [lineHeight*6,minNodeWidth];

  var d3Root = d3Hierarchy(root);
  var tree = d3Tree()
      .nodeSize(minNodeSize)(d3Root); // give nodes enough space to avoid overlap
  ;

  // use nice curves between the nodes
  var diagonal = getLink();

  // assign nodes and links
  var nodes = d3Root.descendants();
  var links = d3Root.links();

  //
  // we want to pan/zoom so that the whole graph is visible.
  //
  // for some reason I can't get getBBox() to give me the bounding box for the overall
  // graph, so instead I'll just check the coords of all the nodes to get a bounding box
  //

  var minX = canvas_width, maxX = 0, minY = canvas_height, maxY = 0;
  nodes.forEach(function(d)
                {minX = Math.min(d.x,minX); minY = Math.min(d.y,minY); maxX = Math.max(d.x,maxX);maxY = Math.max(d.y,maxY);});

  // to make a horizontal tree, x and y are swapped
  var dx = (vert ? maxX - minX : maxY - minY);
  var dy = (!vert ? maxX - minX : maxY - minY);
  var x = (vert ? (minX + maxX)/2 : (minY + maxY)/2);
  var y = (!vert ? (minX + maxX)/2 : (minY + maxY)/2);

  // if flipped, we need to flip the bounding box
  if (queryService.query_plan_options.orientation == orientBT)
    y = -y;
  else if (queryService.query_plan_options.orientation == orientRL)
    x = -x;

  var scale = Math.max(0.15,Math.min(2,.85 / Math.max(dx / canvas_width, dy / canvas_height)));
  var midX = canvas_width / 2 - scale * x, midY = canvas_height / 2 - scale * y;

  // set up zooming
  zoomer = d3Zoom()
    .scaleExtent([0.1, 2.5])
    .on("zoom", zoom);

  d3Select('.wb-explain-d3-wrapper').call(zoomer);

  // set up the initial location of the graph, so it's centered on the screen
  d3Select('.wb-explain-d3-wrapper').transition().call(
      zoomer.transform,
      d3ZoomIdentity.translate(midX,midY).scale(scale)
   );

  // Each node needs a unique id. If id field doesn't exist, use incrementing value
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("svg:g")
      .attr("class", "wb-explain-node")
      .attr("transform", getRootTranslation)
      .on("click", makeTooltip);

  // *** node drop-shadows come from this filter ******************
  // filters go in defs element
  var defs = svg.append("defs");

  // create filter with id #drop-shadow
  // height=130% so that the shadow is not clipped
  var filter = defs.append("filter")
      .attr("id", "drop-shadow")
      .attr("height", "130%");

  // SourceAlpha refers to opacity of graphic that this filter will be applied to
  // convolve that with a Gaussian with standard deviation 1 and store result
  // in blur
  filter.append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", 1)
    .attr("result", "blur");

  // translate output of Gaussian blur downwards with 1px
  // store result in offsetBlur
  filter.append("feOffset")
    .attr("in", "blur")
    .attr("dx", 0)
    .attr("dy", 1)
    .attr("result", "offsetBlur");

  // overlay original SourceGraphic over translated blurred opacity by using
  // feMerge filter. Order of specifying inputs is important!
  var feMerge = filter.append("feMerge");

  feMerge.append("feMergeNode")
    .attr("in", "offsetBlur")
  feMerge.append("feMergeNode")
    .attr("in", "SourceGraphic");

  // ********* create node style from data *******************
  nodeEnter.append("rect")
    .attr("width", function(d) {return getWidth(d);})
    .attr("height", function(d) {return getHeight(d);})
    .attr("rx", lineHeight) // sets corner roundness
    .attr("ry", lineHeight)
    .attr("x", function(d) {return(-1/2*getWidth(d))}) // make the rect centered on our x/y coords
    .attr("y", function(d) {return getHeight(d)*-1/2})
    .attr("class", function(d) { return d.data.level; })
  // drop-shadow filter
    .style("filter", "url(#drop-shadow)");


  nodeEnter.append("text")
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight}) // m
    .attr("class", "wb-explain-node-text")
    .text(function(d) { return d.data.name })
  ;

  // handle up to 4 lines of details
  for (var i=0;i<4;i++) nodeEnter.append("text")
    .attr("dy", function(d) {return getHeight(d)*-1/2 + lineHeight*(i+2)})
    .attr("class", "wb-explain-node-text-details")
    .text(function(d) { return d.data.details[i] })
  ;

  // Transition nodes to their new position.
  var nodeUpdate = nodeEnter.transition(trans)
      .attr("transform", getNodeTranslation);

  //Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition(trans)
      .attr("transform", function(d) { return "translate(" + d3Root.y + "," + d3Root.x + ")"; })
      .remove();

  nodeExit.select("rect")
    .attr("r", 1e-6);

  // Update the links…
  var link = svg.selectAll("path.link")
      .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
  //.attr("class", "wb-explain-link")
    .attr("class", function(l) { // clone nodes are duplicates. if we have a link between 2, we need to hide it
      if (l.target.cloneOf && l.source.cloneOf)
        return("wb-clone-link");
      else
        return("wb-explain-link");
    })
    .attr("marker-start", "url(#arrowhead)")
    .attr("d", function(d) {
      var o = {x: d3Root.x0, y: d3Root.y0};
      var p = diagonal({source: o, target: o});
      return p;
    })
  // Transition links to their new position.
    .transition(trans)
    .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition(trans)
    .attr("d", function(d) {
      var o = {x: d3Root.x, y: d3Root.y};
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

function getLink() {
  switch (queryService.query_plan_options.orientation) {
  case orientTB:
    return d3LinkVertical()
      .x(function(node) {return(node.x)})
      .y(function(node) {return(node.y + getHeight(node)/2)});

  case orientBT:
    return d3LinkVertical()
      .x(function(node) {return(node.x)})
      .y(function(node) {return(-node.y - getHeight(node)/2)});

  case orientLR:
    return d3LinkHorizontal()
      .x(function(node) {return(node.y + getWidth(node)/2)})
      .y(function(node) {return(node.x)});

  case orientRL:
  default:
    return d3LinkHorizontal()
      .x(function(node) {return(-node.y - getWidth(node)/2)})
      .y(function(node) {return(node.x)});
  }
}

function getCloneConnectionEndPoint(node) {

  // otherwise base it on the graph orientation.
  switch (queryService.query_plan_options.orientation) {
  case orientTB:
    return [node.x , node.y];

  case orientBT:
    return [node.x , -node.y];

  case orientLR:
    return [node.y , node.x ];

  case orientRL:
  default:
    return [-node.y , node.x ];
  }
}


function getRootTranslation(root) {
  switch (queryService.query_plan_options.orientation) {
  case orientTB:
  case orientBT:
    root.x0 = 50;
    root.y0 = 0;
    break;

  case orientLR:
  case orientRL:
  default:
    root.x0 = 50;
    root.y0 = 0;
    break;
  }
  return "translate(" + root.x0 + "," + root.y0 + ")";
}

function getNodeTranslation(node) {
  // if the node is a clone, get the translation from the source
  if (node.cloneOf)
    return(getNodeTranslation(node.cloneOf));

  // otherwise base it on the orientation of the graph
  switch (queryService.query_plan_options.orientation) {
  case orientTB:
    return "translate(" + node.x + "," + node.y + ")";

  case orientBT:
    return "translate(" + node.x + "," + -node.y + ")";

  case orientLR:
    return "translate(" + node.y + "," + node.x + ")";

  case orientRL:
  default:
    return "translate(" + -node.y + "," + node.x + ")";
  }
}

//
// make the tooltip for the given node. We want the tooltip
// to go away when the click to dismiss
//

function makeTooltip(d) {
  removeAllTooltips();

  // the tooltip is relative to the query plan div, so we need to know its offset.
  var query_plan_offset = outerElement.offset();

  // create the new tooltip
  var tooltip_div = d3Select(".wb-results-explain")
      .append("div")
      .attr("id", "svg_tooltip" + d.id)
      .attr("class", "wb-explain-tooltip")
  //.on("click", function(event) {
  //  return tooltip_div.style("display", "none");
  //})
  ;

  if (d.data.tooltip && d.data.tooltip.length > 0) {
    tooltip_div.transition().duration(300).style("display", "block");
    var header_div = tooltip_div.append("div");
    header_div.html('<a class="ui-dialog-titlebar-close modal-close" onclick="console.log(\"click\")"> X </a>');
    tooltip_div.html(d.data.tooltip)
      .style("left", (d3Event.x + 40 - query_plan_offset.left) + "px")
      .style("top", (d3Event.y - query_plan_offset.top/2) + "px");
  }

  d3Event.stopPropagation();
}

function removeAllTooltips() {
  // get rid of any existing tooltips
  d3Select(".wb-results-explain").selectAll('.wb-explain-tooltip').remove();
}

//
// function to compute height for a given node based on how many lines
// of details it has
//

function getHeight(node) {
  var numLines = 2;
  if (node && node.data && node.data.details)
    numLines += node.data.details.length;
  return(lineHeight*numLines);
}

//
// compute width by finding the longest line, counting characters
//

function getWidth(node) {
  var maxWidth = 20; // leave at least this much space
  if (node.data && node.data.name && node.data.name.length > maxWidth)
    maxWidth = node.data.name.length;
  if (node.data && node.data.details)
    for (var i=0; i < node.data.details.length; i++)
      if (node.data.details[i] && node.data.details[i].length > maxWidth)
        maxWidth = node.data.details[i].length;

  return(maxWidth * 5); //allow 5 units for each character
}

//
// recursively turn the tree of ops into a simple tree to give to d3
//

function makeSimpleTreeFromPlanNodes(plan,next,parent,nodeCache) {
  // keep a cache of nodes we have created, in case we see them again
  if (!nodeCache)
    nodeCache = {};

  // we ignore operators of nodes with subsequences, and put in the subsequence
  if (plan.subsequence)
    return(makeSimpleTreeFromPlanNodes(plan.subsequence,plan.predecessor,parent,nodeCache));

  if (!plan || !plan.operator)
    return(null);

  // otherwise build a node based on this operator
  var opName = (plan && plan.operator && plan.operator['#operator'])
      ? plan.operator['#operator'] : "unknown op";

  var result = {
//      name: plan.GetName(),
      name: GetName(plan),
//      details: plan.GetDetails(),
      details: GetDetails(plan),
    parent: parent,
    level: "node", // default background color
    time: plan.time,
    time_percent: plan.time_percent,
//    tooltip: plan.GetTooltip()
    tooltip: GetTooltip(plan)
  };

  // how expensive are we? Color background by cost, if we know
  if (plan && plan.time_percent) {
    if (plan.time_percent >= 20)
      result.level = "wb-explain-node-expensive-1";
    else if (plan.time_percent >= 5)
      result.level = "wb-explain-node-expensive-2";
    else if (plan.time_percent >= 1)
      result.level = "wb-explain-node-expensive-3";
  }

  // if we have seen a node with this id before, we need to mark the new node as a clone
  // the clone will then override the layout to move to it's twin's location
  // this is because D3 doesn't support DAGs, so we will fake it with a tree with co-located nodes

  if (plan && plan.operator && plan.operator.operatorId && nodeCache[plan.operator.operatorId])
    result.cloneOf = nodeCache[plan.operator.operatorId];

  // otherwise add this new node to the cache
  else if (plan.operator.operatorId)
    nodeCache[plan.operator.operatorId] = result;

  // if the plan has a 'predecessor', it is either a single plan node that should be
  // our child, or an array marking multiple children

  if (plan.predecessor) {
    result.children = [];
    if (!_.isArray(plan.predecessor)) {
      result.children.push(makeSimpleTreeFromPlanNodes(plan.predecessor,next,result.name,nodeCache));
    }
    else for (var i=0; i< plan.predecessor.length; i++) {
      result.children.push(makeSimpleTreeFromPlanNodes(plan.predecessor[i],null,result.name,nodeCache));
    }
  }

  return(result);
}

function constructDatasetsColumn(datasets) {
  var html = "<div class='column'>";
  html += "<b>Datasets</b><br>";
  for (var dataset in datasets) {
    html += "<em>" + dataset + "</em>&nbsp;&nbsp; ";
  }
  html += "</div>";
  return html;
}

function GetName(plan) {
  // make sure we actually have a name
  if (!plan.operator || !plan.operator['#operator'])
    return(null);

  switch (plan.operator['#operator']) {
  case "InitialProject": // we really want to all InitialProject just plain "Project"
    return("Project");

  case "InitialGroup":
    return("Group");

    // default: return the operator's name
  default:
    return(plan.operator['#operator']);
  }
}

function GetTooltip(plan) {
  var op = plan.operator;

  if (!op || !op['#operator'])
    return("");

  // get details about the op, to see if we have info for a tool tip
  var childFields = getNonChildFieldList(op);
  if (childFields.length == 0) // no fields, no tool tip
    return("");

  // we have some results, build the tooltip
  var result = "";
  result += '<div class="row"><h5>' + op['#operator'] +
    '</h5></div><ul class="wb-explain-tooltip-list">';

  result += childFields;
  result += '</ul>';

  return(result);
}

//
// get an array of node attributes that should be shown to the user
//

function GetDetails(plan) {
  var result = [];
  var op = plan.operator;

  if (!op || !op['#operator'])
    return(result);

  // depending on the operation, extract different fields
  switch (op['#operator']) {

  case "IndexScan": // for index scans, show the keyspace
    pushTruncated(result,"by: " + op.keyspace + "." + op.index);
    break;

  case "IndexScan2":
  case "IndexScan3":
    pushTruncated(result,op.keyspace + "." + op.index);
    if (op.as)
      pushTruncated(result,"as: " + op.as);
    break;

  case "PrimaryScan": // for primary scan, show the index name
    pushTruncated(result,op.keyspace);
    break;

  case "InitialProject":
    pushTruncated(result,op.result_terms.length + " terms");
    break;

  case "Fetch":
    pushTruncated(result,op.keyspace + (op.as ? " as "+ op.as : ""));
    break;

  case "Alias":
    pushTruncated(result,op.as);
    break;

  case "NestedLoopJoin":
  case "NestedLoopNest":
  case "HashJoin":
  case "HashNest":
    pushTruncated(result,"on: " + op.on_clause);
    break;

  case "Limit":
  case "Offset":
    pushTruncated(result,op.expr);
    break;

  case "Join":
    pushTruncated(result,op.keyspace + (op.as ? " as "+op.as : "") + ' on ' + op.on_keys);
    break;

  case "Order":
    if (op.sort_terms) for (var i = 0; i < op.sort_terms.length; i++)
      pushTruncated(result,op.sort_terms[i].expr);
    break;

  case "InitialGroup":
  case "IntermediateGroup":
  case "FinalGroup":
    if (op.aggregates && op.aggregates.length > 0) {
      var aggr = "Aggrs: ";
      for (var i=0; i < op.aggregates.length; i++)
        aggr += op.aggregates[i];
      pushTruncated(result,aggr);
    }

    if (op.group_keys && op.group_keys.length > 0) {
      var keys = "By: ";
      for (var i=0; i < op.group_keys.length; i++)
        keys += op.group_keys[i];
      pushTruncated(result,keys);
    }
    break;

  case "Filter":
    if (op.condition)
      pushTruncated(result,op.condition);
    break;
  }

  // if there's a limit on the operator, add it here
  if (op.limit && op.limit.length)
    pushTruncated(result,op.limit);

  // if we get operator timings, put them at the end of the details
  if (op['#time_normal']) {

    pushTruncated(result,op['#time_normal'] +
                  ((plan.time_percent && plan.time_percent > 0) ?
                   ' (' + plan.time_percent + '%)' : ''));
  }

  // if we have items in/out, add those as well
  if (op['#stats']) {
    var inStr = '';
    var outStr = '';

    // itemsIn is a number
    if (op['#stats']['#itemsIn'] || op['#stats']['#itemsIn'] === 0)
      inStr = op['#stats']['#itemsIn'].toString();
    if (op['#stats']['#itemsOut'] || op['#stats']['#itemsOut'] === 0)
      outStr = op['#stats']['#itemsOut'].toString();

    // if we have both inStr and outStr, put a slash between them
    var inOutStr = ((inStr.length > 0) ? inStr + ' in' : '') +
        ((inStr.length > 0 && outStr.length > 0) ? ' / ' : '') +
        ((outStr.length > 0) ? outStr + ' out' : '');

    if (inOutStr.length > 0)
      pushTruncated(result,inOutStr);
  }

  // handle Analytics operators
  if (op['variables'])
    pushTruncated(result,'vars: ' + op['variables']);
  if (op['expressions'])
    pushTruncated(result,'expr:' + op['expressions']);

  // all done, return the result
  return(result);
}

var MAX_LENGTH = 35;

function pushTruncated(array,item) {
  array.push(truncate(MAX_LENGTH,item));
}

//
// truncate strings longer that a given length
//

function truncate(length, item) {
  if (!_.isString(item))
    return(item);

  if (item.length > length)
    return(item.slice(0,length) + "...");
  else
    return(item);
}

// turn the fields of an operator into list elements,
// but ignore child operators

var childFieldNames = /#operator|\~child*|delete|update|scans|first|second|inputs/;

function getNonChildFieldList(op) {
  var result = "";

  for (var field in op) if (!field.match(childFieldNames)) {
    var val = op[field];
    // add the field name as a list item
    result += '<li>' + field;

    // for a primitive value, just add that as well
    if (_.isString(val) || _.isNumber(val) || _.isBoolean(val))
      result += " - " + val;

    // if it's an array, create a sublist with a line for each item
    else if (_.isArray(val)) {
      result += '<ul>';
      for (var i=0; i<val.length; i++)
        if (_.isString(val[i]))
          result += '<li>' + val[i] + '</li>';
      else
        result += getNonChildFieldList(val[i]);
      result += '</ul>';
    }

    // if it's an object, have a sublist for it
    else if (_.isPlainObject(val)) {
      result += '<ul>';
      result += getNonChildFieldList(val);
      result += '</ul>';
    }
    result += '</li>';
  }
  return result;
}
