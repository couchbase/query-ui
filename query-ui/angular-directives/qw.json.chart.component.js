/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

/**
 * Angular Component that creates user-specified charts for the given data
 */

import saveAs from "file-saver";

import {
  ViewEncapsulation,
  ChangeDetectionStrategy,
  Component,
  Directive,
  ElementRef,
  NgModule,
  Renderer2 }                       from '@angular/core';
import { MnLifeCycleHooksToStream } from 'mn.core';

import { QwJsonCsvService }         from '../angular-services/qw.json.csv.service.js';

import _                            from 'lodash';

import {min as d3Min, max as d3Max, group as d3Group,extent as d3Extent,
  sum as d3Sum, merge as d3Merge}   from "d3-array";
import {nest as d3Nest} from "d3-collection";
import {axisBottom as d3AxisBottom,
  axisLeft as d3AxisLeft }          from "d3-axis";
import {select as d3Select, event as d3Event,
  selectAll as d3SelectAll}         from "d3-selection";
import {line as d3Line, area as d3Area,
  pie as d3Pie, arc as d3Arc}       from "d3-shape";
import {scaleLinear as d3ScaleLinear,
  scaleOrdinal as d3ScaleOrdinal,
  scaleBand as d3ScaleBand,
  scaleTime as d3ScaleTime}         from "d3-scale";
import {schemeTableau10 as d3SchemeTableau10} from "d3-scale-chromatic";
import {mouse as d3Mouse}                     from "d3-selection";
import {timeParse as d3TimeParse,
  timeFormat as d3TimeFormat}           from "d3-time-format";

import {zoom as d3Zoom,
  zoomIdentity as d3ZoomIdentity}             from "d3-zoom";
import { fromEvent }                          from 'rxjs';

export { QwJsonChart };

var svg, tooltip, wrapperElement; // needs to be global for certain callback functions

class QwJsonChart extends MnLifeCycleHooksToStream {
  static get annotations() { return [
    new Component({
      selector: "qw-json-chart",
      templateUrl: "../_p/ui/query/angular-directives/qw.json.chart.template.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.json.chart.css"],
      inputs: [
        "subject"
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
    this.field2_list = '';
    this.field3 = '-1';
    this.chartType = 'scatter';
  }

  ngOnInit() {
    this.resizeObservable = fromEvent(window,'resize');
    this.resizeSubscription = this.resizeObservable.subscribe( evt => this.createChart());
  }

  ngOnDestroy() {
    this.subscription && this.subscription.unsubscribe();
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

  handleNewData(result) {
    this.data = result && result.data;
    this.result = result;
    this.getStateFromQueryResult(); // if they are going through history, there may be new fields;

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
          else if (isDateTime(doc[index]))
            this.flat_data_types[index].datetime = true;
          else if (isDate(doc[index]))
            this.flat_data_types[index].date = true;
          else
            this.flat_data_types[index].string = true;
        if (_.isNumber(field)) this.flat_data_types[index].number = true;
        if (_.isBoolean(field)) this.flat_data_types[index].bool = true;
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
      this.field2_list = this.result.chart_options.field2_list;
      this.field3 = this.result.chart_options.field3;
      this.chartType = this.result.chart_options.chartType;
    }
  }

  saveStateToQueryResult() {
    if (this.result) {
      this.result.set_chart_options(
        {
        field1: this.field1,
        field2: this.field2,
        field2_list: this.field2_list,
        field3: this.field3,
        chartType: this.chartType,
        }
      );
    }
  }

  initSVG() {
    // get rid of anything there already
    var svg2 = this.element.nativeElement.querySelector('svg');
    if (svg2)
      svg2.remove();

    //
    wrapperElement = this.element.nativeElement.querySelector('.chart-d3-wrapper');
    this.d3Wrapper = d3Select('.chart-d3-wrapper');
    this.margin = 40;
    if (wrapperElement) {
      this.canvas_width = wrapperElement.clientWidth - (this.margin*2);
      this.canvas_height = wrapperElement.clientHeight - (this.margin*2);
    }

    // create the svg area for drawing the chart
    svg = d3Select('.chart-d3-wrapper').append('svg:svg')
      .attr("width", "100%")
      .attr("height", "100%")
      .append("svg:g")
      .attr("class","drawarea")
      .attr("id","svg_g")
    ;

    // need a tooltip as well
    if (!tooltip)
      tooltip = d3Select('.chart-d3-wrapper')
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

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
    // need data to work with
    if (!this.flat_data || !this.flat_data.length)
      return;

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

    if ((this.chartType == "scatter"|| this.chartType=="groupedline") && this.field3 >= 0) {
      if (!this.field3 || this.field_invalid_for_chart_type(this.field3,3)) {
        this.field3 = 0;
        while (this.field_invalid_for_chart_type(this.field3,3) && this.field3 < this.flat_data[0].length)
          this.field3++;
        if (this.field_invalid_for_chart_type(this.field3,3))
          this.field3 = -1; // no available field
      }
    }

    this.saveStateToQueryResult();

    // remove any existing charts
    this.initSVG();

    if (this.field1 == null || this.field2 == null ||
      this.field1 >= this.flat_data[0].length || this.field2 >= this.flat_data[0].length) {
      this.chartError = "Fill all fields to plot Charts";
      return;
    }

    // create the specified chart type
    switch (this.chartType) {
      case "xy": this.createXYChart();break;
      case "scatter": this.createScatterChart(); break;
      case "line": this.createLineChart(); break;
      case "groupedline":
      case "multiline":
        this.createGroupedLineChart();
        break;
      //case "multiline": this.createMultiLineChart();break;
      case "area": this.createAreaChart(); break;
      case "bar": this.createBarChart(); break;
      case "connscatter": this.createConnScatterChart(); break;
      case "multiconnscatter": this.createMultiConnScatterChart(); break;
      case "donut": this.createPieChart(true); break;
      case "pie": this.createPieChart(false); break;
      case "gbar": this.createGroupedBarChart(); break;
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
  unflattenData (numFields) {
    // make sure the user selected fields

    var Field1 = this.field1,
        Field2 = this.field2,
        Field3 = this.field3,
        Field2_list = this.field2_list,
        data = [],
        data_x = [],
        data_y = [],
        data_group = [];

    // need data to work
    if (!this.flat_data || this.flat_data.length <= 1)
      return [data, data_x, data_y, data_group];

    // some charts use every piece of data (x-y, line, etc), others aggregate (pie, donut, bar)
    var aggregation_chart = ["pie","donut","bar","gbar"].indexOf(this.chartType) > -1;
    // flatten the data into a data object with x and y values
    // Into data_x for x-axis
    // Into data_y for y-axis
    // possibly into data_z for grouping variables
    // Foreach - hard to break for errors so use a try catch block
    var values = this.flat_data.slice(1);

    if (!aggregation_chart) values.forEach(obj => {
      if (_.isNull(obj[Field1]) == false && _.isNull(obj[Field2]) == false) {

        var tval = obj[Field1];

        if (isDateTime(tval))
          tval = parseDateTime(tval);
        else if (isDate(tval))
          tval = parseDate(tval);

        // scatter charts with color and grouped line charts
        if (Field3 >= 0 && numFields === 3 && (this.chartType == "scatter"|| this.chartType == "groupedline")) {
            // This is for scatter charts
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
        }
        // regular scatter charts
        else {
          // for multiline we need a separate point for each selected column
          if (this.chartType == "multiline" || this.chartType == "multiconnscatter") {
            var t = "";
            for (let i = 0; i < this.field2_list.length; i++) {
              data.push({x: tval, y: obj[this.field2_list[i]], z: this.field2_list[i]}); // z is category
              data_x.push(tval);
              data_y.push(obj[this.field2_list[i]]);
              t = this.fields()[this.field2_list[i]];
              if (data_group.indexOf(t) == -1) {
                data_group.push(t);
              }
            }
          } else {
            data_x.push(tval);
            data.push({x: tval, y: obj[Field2]});
            data_y.push(obj[Field2]);
          }
        }
      }
    });

    // for aggregation charts, need to sum up value fields for each label
    else {
      var x_values = _.uniq(values.map(row => row[Field1])).sort();
      var y_values;

      if (this.chartType != "gbar")
        y_values = x_values.map(val => 0); // start with zero for each x value
      else
        y_values = x_values.map(val => {return { x: val}});

      values.forEach(row => {
        var index = x_values.indexOf(row[Field1]);
        if (index >= 0) {
          // for everything but grouped bar, we want one summed value for each distinct x
          if (this.chartType != "gbar")
            y_values[index] += row[Field2];
          // otherwise, need to iterate over each each selected group field
          else {
            if (_.isArray(Field2_list)) Field2_list.forEach((field,findex) => {
              y_values[index]["v" + findex] = (y_values[index]["v" + findex] || 0) + row[field];
            });
          }
        }
       });

      data_x = x_values;
      for (var i=0;i<x_values.length;i++)
        if (this.chartType != "gbar") {
          data.push({x:x_values[i],y:y_values[i]});
          data_y.push(y_values[i]);
        }
        else {
          var val = {x:x_values[i]};
          Object.assign(val,y_values[i]);
          data.push(val);
          data_y.push(y_values[i].v0);
        }
   }

    // before returning data sort data.x for line and area charts
    if (this.chartType == "line" || this.chartType == "area" ||
        this.chartType == "connscatter" || this.chartType == "groupedline" ||
        this.chartType == "multiline"|| this.chartType == "multiconnscatter") {
      data.sort((firstItem, secondItem) => firstItem.x - secondItem.x);
    }

    if (numFields == 3) {
      return [data, data_x, data_y, data_group];
    } else {
      return [data, data_x, data_y];
    }
  }

  newMin(min) {
    if (min > 0) {
      min = min * 0.95;
    } else {
      min = min * 1.05;
    }
    return min;
  }

  newMax(max) {
    if (max < 0) {
      max = max * 0.95;
    } else {
      max = max * 1.05;
    }
    return max;
  }

  // X-axis plot and label
  createXAxis(values){
    // For date time types
    // lets start with line, area and connected scatter charts for this.

    if ((this.flat_data_types[this.field1].datetime ||
         this.flat_data_types[this.field1].date) &&
        this.chartType!= "bar" &&
        this.chartType!= "gbar") {

      var scale_x = d3ScaleTime()
          .domain(d3Extent(values[0], function (d) {
            return d.x;
          }))
          .range([this.margin, this.canvas_width - this.margin])
          .nice();

      var tickFormat = "%Y-%m-%d";
      if (this.flat_data_types[this.field1].datetime == true) {
        tickFormat = "%Y-%m-%dT%H:%M:%S";
      }

      svg.append("g")
          .attr("transform","translate(0," + (this.canvas_height-this.margin) + ")")
          .call(d3AxisBottom(scale_x).tickFormat(d3TimeFormat(tickFormat)))
          .selectAll("text")
          .attr("transform", "translate(0,10)rotate(-90)")
          .attr("dy","0.3em")
          .attr("y","0")
          .style("text-anchor", "end");

    } else if (this.chartType == "bar"|| this.chartType == "gbar") {
      // axes/scale functions from data to screen pixels
      var scale_x = d3ScaleBand()
          .domain(values[1])
          .range([this.margin,this.canvas_width-this.margin])
          .padding(0.2)
          .round(true) ;

      svg.append("g")
          .attr("transform","translate(0," + (this.canvas_height-this.margin) + ")")
          .call(d3AxisBottom(scale_x))
          .selectAll("text")

          .attr("transform", "translate(0,10)rotate(-90)")
          .attr("dy","0.3em")
          .attr("y","0")
          .style("font-size", function() { if (scale_x.bandwidth() > 20) { return "20px";} else {return scale_x.bandwidth() + "px";}})
          .style("text-anchor", "end");
    } else {
      // axes/scale functions from data to screen pixels
      var min = this.newMin(d3Min(values[1])),
          max = this.newMax(d3Max(values[1]));

      var scale_x = d3ScaleLinear().domain([min,max])
          .range([this.margin,this.canvas_width-this.margin])
          .nice();

       svg.append("g")
           .attr("transform","translate(0," + (this.canvas_height-this.margin) + ")")
           .call(d3AxisBottom(scale_x))
           .selectAll("text")
           .attr("transform", "translate(0,10)rotate(-90)")
           .attr("dy","0.3em")
           .attr("y","0")
           .style("text-anchor", "end");
    }
    return scale_x;
  }

  createYAxis(values) {
    var min = d3Min(values[2]),
        max = d3Max(values[2]);
    if (this.chartType == "gbar") {
      var data = values[0];
      var tempmin = min,
      tempmax = max;

      for (let i = 0; i < this.field2_list.length; i++) {
        tempmin = hasMin(data,"v"+i)["v"+i]
        if (min > tempmin) {
          min = tempmin;
        }
        tempmax = hasMax(data,"v"+i)["v"+i];
        if (max < tempmax) {
          max = tempmax;
        }
      }
    }
    min = this.newMin(min);
    max = this.newMax(max);

    var scale_y = d3ScaleLinear().domain([min,max])
        .range([this.canvas_height-this.margin,this.margin])
        .nice();

    svg.append("g")
      .attr("transform","translate(" + this.margin + ", 0)")
      .call(d3AxisLeft(scale_y));
    return scale_y;
  }

  createXYChart() {
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var This = this; // for use in callbacks

    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", "#669ee0")
        .style("opacity", "0.75")
        .on("mouseover", createShowTooltipFn(d => {return('x: ' + d.x + "<br/>y: "  +d.y)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

  }

  createScatterChart() {
    var values = this.unflattenData(3);
    this.value_count = values[0].length;

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var color = d3ScaleOrdinal()
        .domain(values[3])
        .range(d3SchemeTableau10);

    var This = this; // for use in callbacks

    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", d => color(d.z))
        .on("mouseover", createShowTooltipFn(d => {return('x: ' + d.x + "<br/>y: "  +d.y+ "<br/>Gather: "  +d.z)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    var legend = svg.selectAll(".legend")
        .data(values[3].slice().reverse())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", this.canvas_width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", this.canvas_width+5)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "left")
        .text(function(d) { return d; });
  }

  createGroupedLineChart() {
    var values = this.unflattenData(3);
    // group the data: I want to draw one line per group
    var sumstat = d3Nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) { return d.z;})
        .entries(values[0]);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var color = d3ScaleOrdinal()
        .domain(values[3])
        .range(d3SchemeTableau10);

    // Draw the line
    svg.selectAll(".line")
        .attr("class", "groupedline")
        .data(sumstat)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", function(d){ return color(d.key) })
        .attr("stroke-width", 1.5)
        .attr("d", function(d){
          return d3Line()
              .x(function(d) { return scale_x(d.x); })
              .y(function(d) { return scale_y(d.y); })
              ((d.values))
        })

    var legend = svg.selectAll(".legend")
        .data(values[3].slice().reverse())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", this.canvas_width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", this.canvas_width+5)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "left")
        .text(function(d) { return d; });
  }

  createLineChart() {
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

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
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

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

    var This = this; // for use in callbacks

    // Draw the dot
    svg
        .selectAll('dot')
        .data(values[0])
        .enter().append("circle")
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .style("fill", "#669ee0")
        .on("mouseover", createShowTooltipFn(d => {return('x: ' + d.x + "<br/>y: "  +d.y)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

  }

  createMultiConnScatterChart() {
    var values = this.unflattenData(3);

    // group the data: I want to draw one line per group
    var sumstat = d3Nest() // nest function allows to group the calculation per level of a factor
        .key(function(d) { return d.z;})
        .entries(values[0]);

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var color = d3ScaleOrdinal()
        .domain(values[3])
        .range(d3SchemeTableau10);

    // Draw the line
    svg.selectAll(".line")
        .attr("class", "connscatter")
        .data(sumstat)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", function(d){ return color(d.key) })
        .attr("stroke-width", 1.5)
        .attr("d", function(d){
          return d3Line()
              .x(function(d) { return scale_x(d.x); })
              .y(function(d) { return scale_y(d.y); })
              ((d.values))
        })

    svg
        // First we need to enter in a group
        .selectAll("myDots")
        .data(sumstat)
        .enter()
        .append('g')
        .style("fill", function(d){ return color(d.key) })
        // Second we need to enter in the 'values' part of this group
        .selectAll("myPoints")
        .data(function(d){ return d.values })
        .enter()
        .append("circle")
        .attr("cx", function(d) { return scale_x(d.x) } )
        .attr("cy", function(d) { return scale_y(d.y) } )
        .attr("r", 3)
        .attr("stroke", "white")
        .on("mouseover", createShowTooltipFn(d => {return('x: ' + d.x + "<br/>y: "  +d.y + "<br/>y: " + d.z)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    /* Draw the dot
    svg
        .selectAll('dot')
        .data(sumstat)
        .enter().append("circle")
        .style("fill", function(d){ return color(d.key) })
        .attr("r",3)
        .attr("cx", d => scale_x(d.x))
        .attr("cy", d => scale_y(d.y))
        .on("mouseover", createShowTooltipFn(d => {return('x: ' + d.x + "<br/>y: "  +d.y + "<br/>y: " + d.z)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

     */

    var legend = svg.selectAll(".legend")
        .data(values[3].slice().reverse())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", this.canvas_width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", this.canvas_width+5)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "left")
        .text(function(d) { return d; });
  }

  createAreaChart() {
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

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
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    var This = this; // for use in callbacks

    // Bars
    var h = (this.canvas_height-this.margin)
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
        .on("mouseover", createShowTooltipFn(d => {return('Label: ' + d.x + "<br/>Value: "  +d.y)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
  }

  createGroupedBarChart() {
    var values = this.unflattenData(4);
    this.value_count = values[0].length;

    var scale_x = this.createXAxis(values),
        scale_y = this.createYAxis(values);

    // Another scale for the subgroups position
    // If we are adding a + sign we need to make sure this is redone.
    var subgroups = [];

    for (let i = 0; i < this.field2_list.length; i++) {
      subgroups.push(this.fields()[this.field2_list[i]]);
    }

    var scale_subgroup = d3ScaleBand()
        .domain(subgroups)
        .range([0, scale_x.bandwidth()])
        .padding(0.10)
        .round(true);

    values[0].forEach(function(d) {
      d.subs = subgroups.map(function(name,index)
      {
          return {key: name, value: d["v"+index]};
         });
    });

    var color = d3ScaleOrdinal()
        .domain(subgroups)
        .range(d3SchemeTableau10);

    var This = this; // for use in callbacks

    // Show all the Bars
    var h = (this.canvas_height - this.margin);
    var state = svg.selectAll("myGbar")
        .data(values[0])
        .enter()
        .append("g")
        .attr("transform", function (d) {
          return "translate(" + scale_x(d.x) + ",0)";
        });

        state.selectAll("rect")
        .data(function (d) {return d.subs;})
        .enter()
        .append("rect")
        .attr("x", d => scale_subgroup(d.key))
        .attr("y", d => scale_y(d.value))
        .attr("width", scale_subgroup.bandwidth())
        .attr("height", function (d) {return h - scale_y(d.value);})
        .style("fill", function (d) {return color(d.key);})
        .on("mouseover", showTooltip)
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    function showTooltip(d) {
      tooltip.transition()
          .duration(200)
          .style("opacity", .9);
      tooltip.html("Label: "+
          d3Select(this.parentNode).datum().x+"<br/>"+d.key + ": "  +d.value);
    }

    var legend = svg.selectAll(".legend")
        .data(subgroups.slice().reverse())
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    legend.append("rect")
        .attr("x", this.canvas_width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    legend.append("text")
        .attr("x", this.canvas_width + 2)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "begin")
        .text(function(d) { return d; });

  }

  createPieChart(donut) {
    var values = this.unflattenData(2);
    this.value_count = values[0].length;

    var width = this.canvas_width,
        margin = this.margin -100;

    var total = d3Max(values[2]);
    var label = values[1];

    var final_data = [],
        others = [];

    var i = 0,
    totalother = 0,
        threshold = 3;
    if (values[2].length > 20) {
      threshold = 20;
    }
    values[2].forEach(val => {
      var tmp = val/total * 100;
      if (tmp > threshold) {
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

    var This = this; // for use in callbacks
    // Define the div for the tooltip

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
        .innerRadius(radius - this.margin )
        .outerRadius(radius - this.margin);

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
        .style("opacity", 0.7)
        .on("mouseover", createShowTooltipFn(d => {return('Label: ' + d.data.x + "<br/>Value: "  +d.data.y)}))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

    var textOffset = 10;
    var lab = arc.append("text")
        .attr("transform", function(d) {
          return "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) *
              (radius + textOffset) + "," +
              Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) *
              (radius + textOffset) + ")";
        })
        .attr("text-anchor", function(d){
          var v = (d.startAngle  +d.endAngle) / 2;
          if (v < 0.2) {
            return "middle";
          }
          if ( v < Math.PI) {
            return "beginning";
          } else {
            return "end";
          }
        })
        .text( function(d) { return d.data.x })
        .attr("fill", function(d) { return color(d.data.x); });

    var prev;
    lab.each(function(d, i) {
      if(i > 0) {
        var thisbb = this.getBoundingClientRect(),
            prevbb = prev.getBoundingClientRect();
        // move if they overlap
        if(!(thisbb.right < prevbb.left ||
            thisbb.left > prevbb.right ||
            thisbb.bottom < prevbb.top ||
            thisbb.top > prevbb.bottom)) {
          var ctx = thisbb.left + (thisbb.right - thisbb.left)/2,
              cty = thisbb.top + (thisbb.bottom - thisbb.top)/2,
              cpx = prevbb.left + (prevbb.right - prevbb.left)/2,
              cpy = prevbb.top + (prevbb.bottom - prevbb.top)/2,
              off = Math.sqrt(Math.pow(ctx - cpx, 2) + Math.pow(cty - cpy, 2))/2;

          d3Select(this).attr("transform",
              "translate(" + Math.cos(((d.startAngle + d.endAngle - Math.PI) / 2)) * (radius + textOffset + off) + ","
              + Math.sin((d.startAngle + d.endAngle - Math.PI) / 2) * (radius + textOffset + off) + ")");
        }
      }
      prev = this;
    });

    // again rebind for legend
    var legend = svg.selectAll(".legend") // note appending it to mySvg and not svg to make positioning easier
        .data(pie(others))
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });


    legend.append("text") // add the text
        .attr("x", 2*radius+textOffset)
        .attr("y", -radius)
        .attr("dy", ".35em")
        .style("text-anchor", "left")
        .text(function(d){
          return "Label: "+d.data.x + ", Value: " + d.data.y;
        });
  }

  // when the UI needs a list of fields for the current data result
  fields() {
    if (!this.flat_data || !this.flat_data[0])
      return [];
    return this.flat_data[0];
  }

  // is our current result an array (of docs) or possibly an error message
  isArray() {
    return(_.isArray(this.data));
  }

  isError() {
    return(this.result && this.result.status != 'success');
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
      case "groupedline":
      case "multiline":
      case "area":
      case "connscatter":
      case "multiconnscatter":
        return("X-Axis");

      case "bar":
      case "gbar":
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
      case "groupedline":
      case "area":
      case "connscatter":
        return("Y-Axis");

      case "bar":
      case "donut":
      case "pie":
        return("Value");

      case "gbar":
        return("Bar Values");
      case "multiline":
      case "multiconnscatter":
        return("Y-Values");
    }
    return(null);
  }

  get_field3_label() {
    switch (this.chartType) {
      case "scatter":
        return("Color");
      case "groupedline":
        return("Line per value of");
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
  //

  field_invalid_for_chart_type(field,entry) {
    var type_obj = this.flat_data_types && this.flat_data_types[field];
    if (!type_obj)
      return(true);
    var type_count = Object.keys(type_obj).length;
    var is_number = (type_obj.number && type_count == 1);
    var is_number_date = ((type_obj.number || type_obj.date || type_obj.datetime) && type_count == 1);
    var retval = false;

    switch (this.chartType) {
      //  X-Y, Line, Area, Scatter-Gather: X axis can be number/date, Y must be number, label can be any
      case "xy":
      case "scatter":
      case "line":
      case "groupedline":
      case "multiline":
      case "area":
      case "connscatter":
        switch (entry) {
        case 1: return(!is_number_date); // x axis date or number
        case 2: return(!is_number);      // y axis must be number
        case 3: return(false);           // no type invalid for color
        }
        break;

      // Bar, Grouped Bar: Label (X axis) can be any, Values (Y axes) must be number
      // same for Pie & Donut
      case "bar":
      case "gbar":
      case "donut":
      case "pie":
        switch (entry) {
        case 1: return(false); // no type invalid for x-axis label
        case 2:
        default: return(!is_number);
        }
      break;
    }

    return(retval);
  }

  //
  // put the contents of the SVG in a wrapper for download
  //

  saveChart() {

      var svgHeader = '<?xml version="1.0" encoding="utf-8" standalone="no"?>' +
          '<svg width="' + this.canvas_width + '" height="' + this.canvas_height +
          '" viewBox="0 0 ' + (this.canvas_width + this.margin) + ' ' +
          (this.canvas_height + this.margin) + '" zoomAndPan="disable" ' +
          'xmlns="http://www.w3.org/2000/svg"  xmlns:xlink="http://www.w3.org/1999/xlink">';

    var html = svgHeader + svg
        .attr("title", "svg_title")
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML + '</svg>';

    var file = new Blob([html],{type: "image/svg+xml", name: "chart.svg"});

    saveAs(file,file.name);
  }

  zoom() {
    svg.attr("transform", d3Event.transform);
  }

}

// convenience functions for detecting dates
// need to recognize a variety of formats, variants of ISO 8601
//
// regexes for detecting dates and date/time, plus matching d3 time parsers.
// these are arranged from longest to shortest, as we will try to parse from first to
// last, and we don't want to think it's a date-only if it also has time, for example.
//

const dateTimeFormats = [
  {r: /^(\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d\.\d\d\d)/, p: d3TimeParse("%Y-%m-%dT%H:%M:%S.%L")},
  {r: /^(\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d\d\d)/, p: d3TimeParse("%Y-%m-%dT%H:%M:%S.%L")},
  {r: /^(\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d)/,         p: d3TimeParse("%Y-%m-%d %H:%M:%S")},
  {r: /^(\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d)/,         p: d3TimeParse("%Y-%m-%dT%H:%M:%S")},
];

const dateFormats = [
  {r: /^(\d\d\d\d-\d\d-\d\d)/,                        p: d3TimeParse("%Y-%m-%d")}
];

function isDateTime(dateString) {
  return(dateTimeFormats.some((element) => element.r.exec(dateString))); // match any regex in format list?
}

function isDate(dateString) {
  return(dateFormats.some((element) => element.r.exec(dateString))); // match any regex in format list?
}

function parseDateTime(dateString) {
  for (var i=0; i < dateTimeFormats.length; i++) {
    var match = dateTimeFormats[i].r.exec(dateString);
    if (match) return(dateTimeFormats[i].p(match[0])); // parse only match, ignore extra text
  }
  return(null);
}

function parseDate(dateString) {
  for (var i=0; i < dateFormats.length; i++) {
    var match = dateFormats[i].r.exec(dateString);
    if (match) return(dateFormats[i].p(match[0])); // parse only match, ignore extra text
  }
  return(null);
}

// find min and max values from list
function hasMin(array,attrib) {
  const checker = (o, i) => typeof(o) === 'object' && o[i]
  return (array.length && array.reduce(function(prev, curr){
    const prevOk = checker(prev, attrib);
    const currOk = checker(curr, attrib);
    if (!prevOk && !currOk) return {};
    if (!prevOk) return curr;
    if (!currOk) return prev;
    return prev[attrib] < curr[attrib] ? prev : curr;
  })) || null;
}

function hasMax(array, attrib) {
  const checker = (o, i) => typeof(o) === 'object' && o[i]
  return (array.length && array.reduce(function(prev, curr){
    const prevOk = checker(prev, attrib);
    const currOk = checker(curr, attrib);
    if (!prevOk && !currOk) return {};
    if (!prevOk) return curr;
    if (!currOk) return prev;
    return prev[attrib] > curr[attrib] ? prev : curr;
  })) || null;
}

function moveTooltip(d) {
  var loc = d3Mouse(wrapperElement);
  if (tooltip)
    tooltip.style("top", loc[1] + 'px').style("left", loc[0] + 'px');
}

function hideTooltip(d) {
  if (tooltip) tooltip.transition()
    .duration(500)
    .style("opacity", 0);
}

function createShowTooltipFn(htmlCreator) {
  return function(d) {
    tooltip.transition().duration(200).style("opacity", .9);
    tooltip.html(htmlCreator(d));
  }
}
