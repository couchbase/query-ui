/**
 * Angular directive that creates user-specified charts for the given data
 */
/* global _, angular */

import {
  ViewEncapsulation,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  NgModule,
  Renderer2 } from '/ui/web_modules/@angular/core.js';
import { MnLifeCycleHooksToStream } from '/ui/app/mn.core.js';

import { CommonModule }             from '/ui/web_modules/@angular/common.js';

import { QwJsonCsvService }         from '/_p/ui/query/angular-services/qw.json.csv.service.js';

import _                                      from '/ui/web_modules/lodash.js';

import {min as d3Min, max as d3Max, group as d3Group,extent as d3Extent,
sum as d3Sum}           from "/ui/web_modules/d3-array.js";
import {axisBottom as d3AxisBottom,
  axisLeft as d3AxisLeft }                    from "/ui/web_modules/d3-axis.js";
import {select as d3Select, event as d3Event,
selectAll as d3SelectAll} from "/ui/web_modules/d3-selection.js";
import {linkVertical as d3LinkVertical,
  linkHorizontal as d3LinkHorizontal,
line as d3Line,
area as d3Area,
pie as d3Pie,
arc as d3Arc}         from "/ui/web_modules/d3-shape.js";
import {scaleLinear as d3ScaleLinear,
  scaleOrdinal as d3ScaleOrdinal,
scaleBand as d3ScaleBand,
scaleTime as d3ScaleTime}         from "/ui/web_modules/d3-scale.js";
import {schemeTableau10 as d3SchemeTableau10} from "/ui/web_modules/d3-scale-chromatic.js";
import {transition as d3Transition}           from "/ui/web_modules/d3-transition.js";
import {timeParse as d3TimeParse}           from "/ui/web_modules/d3-time-format.js";

import {interpolate as d3Interpolate}         from "/ui/web_modules/d3-interpolate.js";
import {cluster as d3Cluster, tree as d3Tree} from "/ui/web_modules/d3-hierarchy.js";
import {zoom as d3Zoom,
  zoomIdentity as d3ZoomIdentity}             from "/ui/web_modules/d3-zoom.js";
import {hierarchy as d3Hierarchy}             from "/ui/web_modules/d3-hierarchy.js";
import { fromEvent }                          from '/ui/web_modules/rxjs.js';

export { QwJsonChart };

var svg; // needs to be global for certain callback functions

//
// regex for detecting dates and date/time
// we'll only support ISO 8601, since there are too many other formats
//

const dateEx = /\d\d\d\d-\d\d-\d\d/;
const dateTimeEx = /\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d/;
const parseDate = d3TimeParse("%Y-%m-%d");
const parseDateTime = d3TimeParse("%Y-%m-%dT%H:%M:%S");

class QwJsonChart extends MnLifeCycleHooksToStream {
  static get annotations() { return [
    new Component({
      selector: "qw-json-chart",
      templateUrl: "../_p/ui/query/angular-directives/qw.json.chart.template.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.json.chart.css"],
      inputs: [
        "subject",
        "result"
        ],
      //changeDetection: ChangeDetectionStrategy.OnPush
    })
    ]}

  static get parameters() { return [
    ElementRef,
    QwJsonCsvService,
    Renderer2,
  ] }

  constructor(element, qwJsonCsvService, renderer) {
    super();
    this.element = element;
    this.renderer = renderer;
    this.qwJsonCsvService = qwJsonCsvService;
    this.field1 = '';
    this.field2 = '';
    this.field3 = '';
    this.chartType = 'xy';
  }

  ngOnInit() {
    this.resizeObservable = fromEvent(window,'resize');
    this.resizeSubscription = this.resizeObservable.subscribe( evt => this.createChart());
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.resizeSubscription.unsubscribe();
  }

  // called whenever the chart panel appears
  ngAfterViewInit() {
    this.getStateFromQueryResult();

    if (this.subject)
      this.subscription = this.subject.subscribe(val => this.handleNewData(val));
  }

  //
  // handle a new data set
  //

  handleNewData(val) {
    this.data = val;

    // flatten data
    this.flat_data = this.qwJsonCsvService.convertDocArrayToDataArray(this.data);

    // data for CSV conversion has strings and arrays quoted. We want to unquote the non-arrays.
    // also get type information for each field
    if (this.flat_data && this.flat_data[0]) {
      // initialize an array of type information for each column
      this.flat_data_types = [];
      this.flat_data[0].forEach( (column,index) => {this.flat_data_types[index] = {}});
      // go through the data
      this.flat_data.slice(1).forEach(doc => doc.forEach( (field, index) => {
        // unquote strings
        if (_.isString(field) && field.startsWith("\"") && !field.startsWith("\"["))
          doc[index] = JSON.parse(field);
        // remember type info
        if (_.isString(field))
          if (field.startsWith("\"["))
            this.flat_data_types[index].array = true;
          else if (dateTimeEx.exec(field))
            this.flat_data_types[index].datetime = true;
          else if (dateEx.exec(field))
            this.flat_data_types[index].date = true;
          else
            this.flat_data_types[index].string = true;
        if (_.isNumber(field)) this.flat_data_types[index].number = true;
        if (_.isBoolean(field)) this.flat_data_types[index].bool = true;
        if (_.isDate(field)) this.flat_data_types[index].date = true;
      }));
    }

    // give some time for the window to set up before creating the chart
    var This = this;
    setTimeout(() => {This.createChart()},500);
  }

  getStateFromQueryResult() {
    if (this.result && this.result.chart_options) {
      this.field1 = this.result.chart_options.field1;
      this.field2 = this.result.chart_options.field2;
      this.field3 = this.result.chart_options.field3;
      this.chartType = this.result.chart_options.chartType;
    }
  }

  saveStateToQueryResult() {
    if (this.result) {
      if (!this.result.chart_options)
        this.result.chart_options = {};
      this.result.chart_options.field1 = this.field1;
      this.result.chart_options.field2 = this.field2;
      this.result.chart_options.field3 = this.field3;
      this.result.chart_options.chartType = this.chartType;
    }
  }

  initSVG() {
    // get rid of anything there already
    var svg2 = this.element.nativeElement.querySelector('svg');
    if (svg2)
      svg2.remove();

    //
    this.wrapperElement = this.element.nativeElement.querySelector('.chart-d3-wrapper');
    this.d3Wrapper = d3Select('.chart-d3-wrapper');
    this.margin = 40;
    if (this.wrapperElement) {
      this.canvas_width = this.wrapperElement.clientWidth - (this.margin*2);
      this.canvas_height = this.wrapperElement.clientHeight - (this.margin*2);
    }

    // create the svg area for drawing the chart
    svg = d3Select('.chart-d3-wrapper').append('svg:svg')
      .attr("width", "100%")
      .attr("height", "100%")
      .append("svg:g")
      .attr("class","drawarea")
      .attr("id","svg_g")
    ;

    // set up zooming
    this.zoomer = d3Zoom()
      .scaleExtent([0.1, 2.5])
      .on("zoom", this.zoom);

    d3Select('.chart-d3-wrapper').call(this.zoomer);

    // move everything over so that the x axis isn't the left edge
    // d3Select('.chart-d3-wrapper').transition().call(
    //   this.zoomer.transform,
    //   d3ZoomIdentity.translate(this.margin*2,this.margin)
    // );

  }

  createChart() {
    // if we don't have a valid field specified to chart, pick something
    if (!this.field1 || this.field_invalid_for_chart_type(this.field1,1)) {
      this.field1 = 0;
      while (this.field_invalid_for_chart_type(this.field1,1) && this.field1 < this.flat_data[0].length)
        this.field1++;
    }
    
    if (!this.field2 || this.field_invalid_for_chart_type(this.field2,2)) {
      this.field2 = 0;
      while ((this.field_invalid_for_chart_type(this.field2,2) || this.field2 == this.field1) && this.field2 < this.flat_data[0].length)
        this.field2++;
    }

    if (this.chartType == "scatter") {
      if (!this.field3 || this.field_invalid_for_chart_type(this.field3,3)) {
        this.field3 = 0;
        while (this.field_invalid_for_chart_type(this.field3,3) && this.field3 < this.flat_data[0].length)
          this.field3++;
      }
    }

    this.saveStateToQueryResult();

    if (this.chartType == "scatter" && !this.field3) {
      this.chartError ="Field 3 is needed to gather the data by color";
      return;
    }

    if (this.field1 == null || this.field2 == null ||
      this.field1 >= this.flat_data[0].length || this.field2 >= this.flat_data[0].length) {
      this.chartError = "Fill all fields to plot Charts";
      return;
    }
    // remove any existing charts
    this.initSVG();

    // create the specified chart type
    switch (this.chartType) {
      case "xy": this.createXYChart();break;
      case "scatter": this.createScatterChart(); break;
      case "line": this.createLineChart(); break;
      case "area": this.createAreaChart(); break;
      case "bar": this.createBarChart(); break;
      case "connscatter": this.createConnScatterChart(); break;
      case "donut": this.createPieChart(true); break;
      case "pie": this.createPieChart(false); break;
    }

    // center the drawing area
    let drawarea = this.element.nativeElement.querySelector('.drawarea');
    let svg = this.element.nativeElement.querySelector('svg');
    if (drawarea) {
      let bbox_draw = drawarea.getBoundingClientRect();
      let bbox_svg = svg.getBoundingClientRect();
      let scale = Math.min(this.canvas_width / bbox_draw.width,this.canvas_height / bbox_draw.height);
      let offsetX = bbox_svg.x - bbox_draw.x + this.margin;
      let offsetY = bbox_svg.y - bbox_draw.y + this.margin;

      this.d3Wrapper.transition().call(
        this.zoomer.transform,
        d3ZoomIdentity.translate(offsetX*scale,offsetY*scale).scale(scale)
      );
    }
  }

  // Flatten input data into d3 readable format
  // Here we also type check the data
  flattenData(numFields) {
    // make sure the user selected fields

    var Field1 = this.field1,
        Field2 = this.field2,
        data = [],
        data_x = [],
        data_y = [];

    if (numFields === 3) {
      var Field3 = this.field3,
          data_group = [];
    }

    // flatten the data into a data object with x and y values
    // Into data_x for x-axis
    // Into data_y for y-axis
    // possibly into data_z for grouping variables
    // Foreach - hard to break for errors so use a try catch block
    if (this.flat_data) this.flat_data.slice(1).forEach(obj => {
      if (_.isNull(obj[Field1]) == false && _.isNull(obj[Field2]) == false) {

        var tval = obj[Field1];
        if (dateTimeEx.exec(tval))
          tval = parseDateTime(tval);
        else if (dateEx.exec(tval))
          tval = parseDate(tval);

        if (numFields == 3) {

          if (_.isNull(obj[Field3]) == false) {
            // Populate data thats not null only.
            data.push({x: tval, y: obj[Field2], z: obj[Field3]});

            // Distinct values to Gather by
            if (data_group.indexOf(obj[Field3]) == -1) {
              data_group.push(obj[Field3]);
            }
          }
          data_x.push(tval);
          data_y.push(obj[Field2]);
        } else {
          if (this.chartType == "pie" || this.chartType == "bar" || this.chartType == "donut") {
            // Distinct values only. consolidate tval
            var index = data_x.indexOf(obj[Field1]);
            if (index != -1) {
              // ALready exists
              // Add to existing value
              data_y[index] = data_y[index] + obj[Field2];
              data[index].y = data_y[index];
            } else {
              data.push({x: tval, y: obj[Field2]});
              data_x.push(tval);
              data_y.push(obj[Field2]);
            }
          } else {
            data.push({x: tval, y: obj[Field2]});
            data_x.push(tval);
            data_y.push(obj[Field2]);
          }
        }

      }
    });

    // before returning data sort data.x for line and area charts
    if (this.chartType == "line" || this.chartType == "area" || this.chartType == "connscatter") {
      data.sort((firstItem, secondItem) => firstItem.x - secondItem.x);
    }

    if (numFields == 3) {
      return [data, data_x, data_y, data_group];
    } else {
      return [data, data_x, data_y];
    }
  }

  // X-axis plot and label
  createXAxis(values){
    // For date time types
    // lets start with line, area and connected scatter charts for this.

    if (this.flat_data_types[this.field1].date == true) {

      var scale_x = d3ScaleTime()
          .domain(d3Extent(values[0], function (d) {
            return d.x;
          }))
          .range([this.margin, this.canvas_width - this.margin]);

      svg.append("g")
          .attr("transform","translate(0," + (this.canvas_height-40) + ")")
          .call(d3AxisBottom(scale_x));
    }

    if (this.chartType == "bar") {
      // axes/scale functions from data to screen pixels
      var scale_x = d3ScaleBand()
          .domain(values[1])
          .range([this.margin,this.canvas_width-this.margin])
          .padding(0.2);

      svg.append("g")
          .attr("transform","translate(0," + (this.canvas_height-40) + ")")
          .call(d3AxisBottom(scale_x))
          .selectAll("text")
          .attr("transform", "translate(0,10)rotate(-90)")
          .attr("dy","0.3em")
          .attr("y","0")
          .style("font-size", function() { if (scale_x.bandwidth() > 20) { return 20;} else {return scale_x.bandwidth();}})
          .style("text-anchor", "end");
    } else {
      // axes/scale functions from data to screen pixels
      var scale_x = d3ScaleLinear().domain([d3Min(values[1]),d3Max(values[1])])
          .range([this.margin,this.canvas_width-this.margin]);

       svg.append("g")
           .attr("transform","translate(0," + (this.canvas_height-40) + ")")
           .call(d3AxisBottom(scale_x));
    }
    return scale_x;
  }

  createYAxis(values) {
    var scale_y = d3ScaleLinear().domain([d3Min(values[2]),d3Max(values[2])])
        .range([this.canvas_height-this.margin,this.margin]);

    svg.append("g")
      .attr("transform","translate(40, 0)")
      .call(d3AxisLeft(scale_y));
    return scale_y;
  }

  createXYChart() {
    var values = this.flattenData(2);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", "#669ee0");
  }

  createScatterChart() {
    var values = this.flattenData(3);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var color = d3ScaleOrdinal()
        .domain(values[3])
        .range(d3SchemeTableau10);

    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", d => color(d.z));
        //.on("mouseover",highlight);
    }

  createLineChart() {
    var values = this.flattenData(2);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    svg.append('path')
        .datum(values[0])
        .attr("fill","none")
        .attr("stroke", "#669ee0")
        .attr("stroke-width", 2)
        .attr("d", d3Line()
        .x(d=>scale_x(d.x))
        .y(d=>scale_y(d.y))
    );
  }

  createConnScatterChart() {
    var values = this.flattenData(2);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    // Draw the line
    svg.append('path')
        .datum(values[0])
        .attr("fill","none")
        .attr("stroke", "#669ee0")
        .attr("stroke-width", 3)
        .attr("d", d3Line()
            .x(d=>scale_x(d.x))
            .y(d=>scale_y(d.y))
        );

    // Draw the dot
    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", "#669ee0");

  }

  createAreaChart() {
    var values = this.flattenData(2);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    svg.append('path')
        .datum(values[0])
        .attr("fill","#669ee0")
        .attr("stroke", "#669ee0")
        .attr("stroke-width", 2)
        .attr("d", d3Area()
            .x(d=>scale_x(d.x))
            .y0(scale_y(d3Min(values[2])))
            .y1(d=>scale_y(d.y))
        );
  }

  createBarChart() {
    var values = this.flattenData(2);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    // Bars
    var h = (this.canvas_height-40)
    svg.selectAll("mybar")
        .data(values[0])
        .enter()
        .append("rect")
        .attr("x", d => scale_x(d.x) )
        .attr("y", d => scale_y(d.y))
        .attr("width", scale_x.bandwidth())
        .attr("height", function(d) {return h - scale_y(d.y); })
        .attr("class", "querychartsBars")
        .style("fill", "#669ee0")
  }


  createPieChart(donut) {
    var values = this.flattenData(2);
    var width = this.canvas_width,
        margin = this.margin -100;

    var total = d3Max(values[2]);
    var label = values[1];

    var final_data = [],
        others = [];

    var i = 0,
    totalother = 0;
    values[2].forEach(val => {
      var tmp = val/total * 100;
      if (tmp > 3) {
        final_data.push({x: label[i], y: val});
      } else {
        others.push({x: label[i], y: val});
        totalother += val;
      }
      i +=1;
    });

    if (totalother > 0)
      final_data.push({x:"Others", y:totalother});

    var color = d3ScaleOrdinal()
        .domain(values[0])
        .range(d3SchemeTableau10);

    // The radius of the pieplot is half the width or half the height (smallest one). I subtract a bit of margin.
    var radius = (Math.min(this.canvas_width, this.canvas_height) - this.margin)/2;

    var pie = d3Pie()
        .sort(null) // Do not sort group by size
        .value(function (d) {return d.y;})

    var rad = donut ? radius/2 : 0;
    
    var path = d3Arc()
        .innerRadius(rad)         // This is the size of the donut hole
        .outerRadius(radius-10)
        .padAngle(.02)
        .padRadius(100)
        .cornerRadius(2);

// Another arc that won't be drawn. Just for labels positioning
    var outerArc = d3Arc()
        .innerRadius(radius * 0.9)
        .outerRadius(radius * 0.9);

    var label = d3Arc()
        .innerRadius(radius -40 )
        .outerRadius(radius - 40);

    var totalv = 0;

    values[0].forEach(function(d) {
      totalv = totalv+d.y;
      return totalv;
    });

    // Build the pie chart: Basically, each part of the pie is a path that we build using the arc function.
    var arc = svg
        .selectAll('.arc')
        .data(pie(final_data))
        .enter()
        .append('g')
        .attr("class", path);

     arc.append("path")
        .attr("d", path)
        .attr("fill", function(d) { return color(d.data.x); })
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("opacity", 0.7);

    arc.append("text")
        .attr("transform",function(d,i){
          var pos = outerArc.centroid(d);
          pos[0] = radius * (midAngle(d) < Math.PI ? 1.1 : -1.1);
          var percent = (d.endAngle - d.startAngle)/(2*Math.PI)*100
          if(percent<3){
            pos[1] += i*15
          }
          return "translate("+ pos +")";
        })
        .text( function(d) { return d.data.x })
        .attr("fill", function(d,i) { return color(i); })
        .attr("text-anchor", 'left')
        .attr("dx", function(d){
          var ac = midAngle(d) < Math.PI ? 0:-50
          return ac
        })
        .attr("dy", 5 )

    function midAngle(d) {
      return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    var polyline = svg.selectAll('polyline')
        .data(pie(final_data), function(d) { return d.data.x;})
        .enter()
        .append("polyline")
        .attr("points", function(d,i) {
          var pos = outerArc.centroid(d);
          pos[0] = radius * 0.95 * (midAngle(d) < Math.PI ? 1 : -1);
          var o=   outerArc.centroid(d)
          var percent = (d.endAngle -d.startAngle)/(2*Math.PI)*100
          if(percent<3){
            pos[1] += i*15
          }
          return [label.centroid(d),[o[0],pos[1]] , pos];
        })
        .style("fill", "none")
        //.attr('stroke','grey')
        .attr("stroke", function(d,i) { return color(i); })
        .style("stroke-width", "1px");

    // again rebind for legend
    var legendG = svg.selectAll(".legend") // note appending it to mySvg and not svg to make positioning easier
        .data(pie(others))
        .enter().append("g")
        .attr("transform", function(d,i){
          return "translate(" + (width - margin) + "," + (i * 20 + 20) + ")"; // place each legend on the right and bump each one down 15 pixels
        })
        .attr("class", "legend");

    legendG.append("text") // add the text
        .text(function(d){
          return d.data.x + "   ==>   " + d.data.y;
        })
        //.style("font", "12 times")
        .attr("y", 10)
        .attr("x", 11);

  }

  // when the UI needs a list of fields for the current data result
  fields() {
    return this.flat_data[0] || [];
  }

  // is our current result an array (of docs) or possibly an error message
  isArray() {
    return(_.isArray(this.data));
  }

  ten_sample_values(field) {
    var result = '';
    var cnt = 0;
    if (field != null) for (var i=1; i < this.flat_data.length && cnt < 10; i++) {
      if (_.isNull(this.flat_data[i][field]) == false) {
        result += this.flat_data[i][field] + ' ';
        cnt++;
      }
    }
    return(result);
  }

  get_types(field) {
    if (!this.flat_data_types || field == null)
      return("");

    if (!this.flat_data_types[field])
      return("");

    var types = " (";
    if (this.flat_data_types[field].string)
      types += " string";
    if (this.flat_data_types[field].number)
      types += " number";
    if (this.flat_data_types[field].bool)
      types += " bool";
    if (this.flat_data_types[field].date)
      types += " date";
    if (this.flat_data_types[field].datetime)
      types += " datetime";
    types += " ) ";
    return(types);
  }

  // get the label for the fields given the chart type
  get_field1_label() {
    switch (this.chartType) {
      case "xy":
      case "scatter":
      case "line":
      case "area":
      case "connscatter":
        return("X-Axis");

      case "bar":
      case "donut":
      case "pie":
        return("Label");
    }

    return(null);
  }

  get_field2_label() {
    switch (this.chartType) {
      case "xy":
      case "scatter":
      case "line":
      case "area":
      case "connscatter":
        return("Y-Axis");

      case "bar":
      case "donut":
      case "pie":
        return("Value");
    }

    return(null);
  }

  get_field3_label() {
    switch (this.chartType) {
      case "scatter":
        return("Gather");
    }

    return(null);
  }

  // is a given field a string value?
  field_is_string(field) {
    var type_obj = this.flat_data_types[field];
    var type_count = Object.keys(type_obj).length;
    return(type_obj.string && type_count == 1);
  }
  
  // is a given field invalid for the selected chart type and entry?

  field_invalid_for_chart_type(field,entry) {
    var type_obj = this.flat_data_types[field];
    if (!type_obj)
      return(true);
    var type_count = Object.keys(type_obj).length;
    var is_number = ((type_obj.number || type_obj.date || type_obj.datetime) && type_count == 1);
    var retval = false;

    switch (this.chartType) {
      // some charts require only numeric values
      case "xy":
      case "scatter":
      case "line":
      case "area":
      case "connscatter":
        if (entry < 3)
          retval = !is_number; // invalid if not number
        else
          retval = false; // any type for gather
        break;

      case "bar":
      case "donut":
      case "pie":
        if (entry > 1) // Label can be anything
          retval = !is_number;
    }

    return(retval);
  }

  zoom() {
    svg.attr("transform", d3Event.transform);
  }

}
