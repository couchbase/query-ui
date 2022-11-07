/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

/**
 * Make a table of editable cells, each row corresponding to a document, each
 * with a meta-id that we want to show as well. In addition to editable cells, documents
 * may also be shown as non-editable JSON. Buttons for each row allow the corresponding document
 * to be copied, edited, or deleted.
 *
 * This is the Angular 8 version, updated from the original AngularJS table editor.
 *
 *  Example usage:
 *
 *  <qw-json-table-editor2 [data]="dec.options.current_result" [controller]="dec"></qw-json-table-editor2>
 *
 * Since this component is used in the context of the surrounding document editor component, that
 * document editor needs to be passed in to provide hooks for creating and editing documents.
 *
 */

var my_decorate = function (decorators, target, key, desc) {
  var c = arguments.length,
    r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
};


import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Compiler,
  Component,
  NgModule,
  ViewContainerRef,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';

import {QwConstantsService}       from '../angular-services/qw.constants.service.js';
import {QwMetadataService}        from '../angular-services/qw.metadata.service.js';
import {QwQueryWorkbenchService}           from '../angular-services/qw.query.workbench.service.js';

import {FormsModule}              from '@angular/forms';
import {MnLifeCycleHooksToStream} from 'mn.core';
import {CommonModule}             from '@angular/common';
import _                          from "lodash";

export {QwJsonTableEditor2};

var This = null;

class QwJsonTableEditor2 extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        selector: "qw-json-table-editor2",
        template: '<p #container></p>',
        styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
        encapsulation: ViewEncapsulation.None,
        changeDetection: ChangeDetectionStrategy.OnPush,
        inputs: [
          "config_subject",  // an observable Subject with results, field vs. text editing, and whether query is busy
          "controller" // qw.documents.component
        ],
      })
    ]
  }

  static get parameters() {
    return [
      ChangeDetectorRef,
      Compiler,
      ViewContainerRef,
      QwConstantsService,
      QwMetadataService,
      QwQueryWorkbenchService,
    ]
  }

  constructor(changeDetectorRef,compiler, vcr, qwConstantsService, qwMetadataService, qwQueryService) {
    super();
    this.cdr = changeDetectorRef;
    this.compiler = compiler;
    this.rbac = qwMetadataService.rbac;
    this.qwConstantsService = qwConstantsService;
  }

  // the table editor is dynamically created HTML that needs to use angular functions,
  // so we use ViewChild and a factory to create and compile the component

  addComponent(template) {
    class TemplateComponent {
      constructor() {
      }

    }

    // js equivalent of @ViewChild('target', {static: false, read: ViewContainerRef})
    my_decorate([
      ViewChild('target', {static: false, read: ViewContainerRef})
    ], TemplateComponent.prototype, "target", void 0);

    class TemplateModule {
    }

    my_decorate([
      ViewChild('target', {static: false, read: ViewContainerRef})
    ], TemplateModule.prototype, "target", void 0);
    const componentType = Component({template: template + '<div #target></div>'})(TemplateComponent);
    const componentModuleType = NgModule({
      declarations: [componentType],
      imports: [FormsModule, CommonModule]
    })(TemplateModule);
    const mod = this.compiler.compileModuleAndAllComponentsSync(componentModuleType);
    const factory = mod.componentFactories.find((comp) => comp.componentType === componentType);
    this.container.clear();
    var component = this.container.createComponent(factory);
    // add scroll listeners to sync the horizontal scrolling of header and table
    if (this.container._data && this.container._data.renderElement) {
      var wrapper = this.container._data.renderElement.nextElementSibling;
      var header = wrapper.childNodes[0];
      var table = wrapper.childNodes[1];
      header.addEventListener("scroll", function () {
        table.scrollLeft = header.scrollLeft;
      });
      table.addEventListener("scroll", function () {
        header.scrollLeft = table.scrollLeft;
      });
    }
    // data elements accessible to the Angular in the generated HTML
    component.instance.results = this.data;
    component.instance.dec = this.controller;
    component.instance.rbac = this.rbac;
    component.instance.getTooltip = getTooltip;
    component.instance.sortTable = sortTable;
    component.instance.isSorted = isSorted;
    component.instance.sortForward = doSortForward;
  }

  ngOnInit() {
    This = this;
    this.subscription = this.config_subject.subscribe(val => {
      if (this.controller.options.current_result != this.data) {
        this.data = this.controller.options.current_result;
        this.tableHTML = createHTMLFromJson(this.data);
        this.addComponent(this.tableHTML);
      }
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

}

//////////////////////////////////////////////////////////////////////////////////////
// js equivalent of TypeScript @ViewChild('container', { read: ViewContainerRef })
my_decorate([ViewChild('container', {read: ViewContainerRef})],
  QwJsonTableEditor2.prototype, "container", void 0);

//////////////////////////////////////////////////////////////////////////////////////
// functions for handling table sorting

var sortField;      // field to sort by, if any
var sortCol = -1;
var sortForward = true;
var sortById = false;

function sortTable($event, index) {
  var startSortColumn = meta.hasNonObject ? 3 : 2;
  sortById = (index < startSortColumn);
  var colname = "";
  if ($event && $event.target && $event.target.dataset && $event.target.dataset.colname)
    colname = unsanitize($event.currentTarget.dataset.colname);
  else
    colname = $event.currentTarget.textContent;

  // if they clicked a different field, sort forward by that field
  if (colname !== sortField) {
    sortForward = true;
    sortField = colname;
    sortCol = index;
  }

  // if they clicked the same field, reverse the sort direction
  else
    sortForward = !sortForward;

  // now sort the data, clear the div, and recreate the table
  meta["outerKey"] = "data";
  if (sortById)
    This.data.sort(compareById);
  else
    This.data.sort(compare);

  This.tableHTML = createHTMLFromJson(This.data);
  This.addComponent(This.tableHTML);
}

function isSorted(col) {
  return (sortCol == col);
}

function doSortForward() {
  return (sortForward);
}

// compare two rows based on the sort field
function compare(a, b) {
  return (myCompare(a, b, sortField, meta));
}

// compare two rows based on the doc ID
function compareById(a, b) {
  var direction = (sortForward ? 1 : -1);
  return a.id.localeCompare(b.id) * direction;
}

// since we may need to sort subobjects, make our comparison general
function myCompare(a, b, sortField, meta) {
  var val1, val2;

  if (meta && meta.outerKey) {
    val1 = a[meta.outerKey] ? a[meta.outerKey][sortField] : null;
    val2 = b[meta.outerKey] ? b[meta.outerKey][sortField] : null;
  } else {
    val1 = a[sortField];
    val2 = b[sortField];
  }

  var direction = (sortForward ? 1 : -1);

//  console.log("Got sortField: *" + sortField + "*");
//  console.log("Comparing a: " + JSON.stringify(a));
//  console.log("  to b: " + JSON.stringify(b));
//  console.log("  val1: " + JSON.stringify(val1) + " type: " + (typeof val1));
//  console.log("  val2: " + JSON.stringify(val2) + " type: " + (typeof val2));

  // if one is undefined and the other is not, undefined always goes last
  if ((typeof val1 === 'undefined' || val1 == null) && typeof val2 !== 'undefined')
    return 1 * direction;

  if (typeof val1 !== 'undefined' && (typeof val2 === 'undefined' || val2 == null))
    return -1 * direction;

  if ((typeof val1 === 'undefined' || val1 == null) && (typeof val2 === 'undefined' || val2 == null))
    return 0;

  // do they have the same type? then we can compare
  if (typeof val1 === typeof val2) {
    if (_.isNumber(val1))
      return ((val1 - val2) * direction);
    if (_.isBoolean(val1))
      return (val1 == val2 ? 0 : (val1 ? direction : 0));
    if (_.isString(val1))
      return (val1.localeCompare(val2) * direction);

    // typeof array and object is the same, need to see which it is
    if (_.isArray(val1)) {
      if (!_.isArray(val2)) // put objects before arrays
        return (-1 * direction);
      else {
        // how to compare arrays? compare each element until a difference
        for (var i = 0; i < Math.min(val1.length, val2.length); i++) {
          var res = myCompare(val1, val2, i);
          if (res != 0)
            return (res);
        }
        // if one array was shorter, put it first
        if (i < val2.length)
          return (1 * direction);
        else if (i < val1.length)
          return (-1 * direction);
        else
          return (0); // two were entirely equal
      }
    }
    if (_.isPlainObject(val1)) { // to compare objects, compare the fields
      for (var key in val1) {
        var res = myCompare(val1, val2, key);
        if (res != 0)
          return (res);
      }
      return (0);
    }
    console.log("shouldn't get here: " + JSON.stringify(val1) + "," + JSON.stringify(val2));
    return (0);
  }

  // types of two values are not equal. Order by bool, number, string, object, array
  if (_.isBoolean(val1))
    return (-1 * direction);
  if (_.isNumber(val1))
    return (-1 * direction);
  if (_.isString(val1))
    return (-1 * direction);
  if (_.isPlainObject(val1))
    return (-1 * direction);

  console.log("shouldn't get here2" +
    ": " + JSON.stringify(val1) + "," + JSON.stringify(val2));

  return (0);
}

//////////////////////////////////////////////////////////////////////////////////////
// functions to create the HTML from the data

function createHTMLFromJson(json) {

  var wrapperStart = '<div class="data-table-wrapper show-scrollbar">';
  var wrapperEnd = '</div>';
  var resultHTML = '';

  // do we have data to work with?
  if (json && _.isArray(json)) {
    tdata = json;
    meta = getMetaData(json);

    // make the table header with the top-level fields
    if (meta.truncated)
      resultHTML += angular.element('<div class="error text-small">Some documents too large for tabular editing, tabular view truncated.</div>')[0];
    var headerHTML = createHTMLheader(meta);

    var tableHTML = makeHTMLTopLevel();

    resultHTML = headerHTML + wrapperStart + tableHTML + wrapperEnd;
  }

  // if json not array, it must be error message string
  else {
    resultHTML = wrapperStart + json + wrapperEnd;
  }

  return (resultHTML);
}

// globals used for sorting, etc.

var tdata;          // all our data
var meta;           // metadata on data sizing

// avoid HTML injection by changing tag markers to HTML

var lt = /</gi;
var gt = />/gi;
var openBrace = /\{/gi;
var closeBrace = /\{/gi;
var quote = /"/gi;
var singleQuote = /'/gi;
var amp = /&/gi;
var backs = /\\/gi;

var mySanitize = function (str) {
  if (!str) return ('');
  else if (_.isString(str))
    return (str
        .replace(amp, '&amp;')
        .replace(backs, '&#92;')
        .replace(lt, '&lt;')
        .replace(gt, '&gt;')
        .replace(openBrace, '&#123;')
        .replace(closeBrace, '&#125;')
        .replace(quote, '&#34;')
    );
  else
    return (str);
};

var mySanitizeQuotes = function (str) {
  if (!str) return ('');
  else if (_.isString(str))
    return (str
        .replace(singleQuote, "\\'")
        .replace(quote, '&#34;')
    );
  else
    return (str);
};

// for sorting we need to take a sanitized column name and bring it back
var unsanitize = function(str) {
  if (!str) return ('');
  else if (_.isString(str))
    return (str
        .replace(/&#92;/g,'\\')
        .replace(/&lt;/g,'<')
        .replace(/&gt;/g,'>')
        .replace(/&#123;/g,'{' )
        .replace(/&#125;/g,'}' )
        .replace(/&#34;/g,'"')
        .replace(/&amp;/g,'&' )
    );
  else
    return (str);
};

//
// get metadata about the table, columns and widths
// to create the set of columns, by looking at the fields of every object. If the array
// only has primitives, then we'll output a single column table listing them.
// If the array is heterogenous, then some rows will be objects, and some rows will
// be arrays/primitives
//

function getMetaData(object) {
  //
  // traverse the data to figure out what fields are present in every row, and
  // how many columns are needed by each field
  //

  var maxWidth = 250;
  var topLevelKeys = {};
  var columnWidths = {};
  var totalCount = 0;
  var totalWidth = 0;
  var hasNonObject = false;
  var hasOps = false; // are we looking at top keys with ops/sec?
  var unnamedWidth;
  var rowCounts = [];
  var truncated = false; // did we have to leave out
  for (var row = 0; row < object.length; row++) {
    rowCounts[row] = 0;
    if (object[row] && object[row].data && object[row].id && object[row].meta && object[row].meta.type === "json") {
      if (object[row].ops)
        hasOps = true;
      //console.log("row: " + row + ": " + JSON.stringify(object[row].data));
      var data = object[row].data;
      // if the data is a sub-array, or primitive type, they will go in an unnamed column,
      // and figure out how much space it needs
      if (_.isArray(data) || isPrimOrNull(data)) {
        hasNonObject = true;
        var area = getColumnArea(data);
        var width = area.width;
        rowCounts[row] += area.count;
        if (!unnamedWidth || width > unnamedWidth)
          unnamedWidth = width;
      }

      // otherwise it's an object, loop through its keys
      else if (_.isPlainObject(object[row].data)) for (let key in object[row].data) {
        topLevelKeys[key] = true;
        // see how much space this value requires, remember the max
        var area = getColumnArea(object[row].data[key]);
        var width = area.width;
        rowCounts[row] += area.count;
        if (!columnWidths[key] || width > columnWidths[key])
          columnWidths[key] = width;
      }
    }
    totalCount += rowCounts[row];
  }

  for (let key in topLevelKeys) {
    totalWidth += columnWidths[key];
  }

  // if the total width is > the max number of columns, truncate the data to be presented
  if (totalWidth > maxWidth) {
    var truncatedKeys = {};
    var newWidth = 0;
    _.forIn(topLevelKeys, function (value, key) {
      if ((newWidth + columnWidths[key]) < maxWidth) {
        truncatedKeys[key] = true;
        newWidth += columnWidths[key];
      }
    });

    truncated = true;
    totalWidth = newWidth;
    topLevelKeys = truncatedKeys;
  }


  return ({
    topLevelKeys: topLevelKeys, columnWidths: columnWidths, totalWidth: totalWidth,
    hasNonObject: hasNonObject, unnamedWidth: unnamedWidth, rowCounts: rowCounts,
    truncated: truncated, hasOps: hasOps, totalCount: totalCount
  });
}

//
// make a header for the table that will be fixed
//

function createHTMLheader(meta) {
  //
  // We have widths for each column, so we can create the header row
  //
  var startSortColumn = meta.hasNonObject ? 3 : 2; // don't allow sorting on first few columns
  var columnHeaders = '<div class="data-table-header-row">';
  columnHeaders += '<span class="data-table-header-cell" style="width:' + columnWidthPx * 1.25 + 'px">&nbsp;</span>'; // tools
  columnHeaders += '<span class="data-table-header-cell" (click)="sortTable($event,1)" style="width:' + columnWidthPx * 2 + 'px">id' +
    '<span class="caret-subspan icon" *ngIf="isSorted(1)" [ngClass]="' +
    "{'fa-caret-down': sortForward(), 'fa-caret-up': !sortForward()}" + '"></span></span>'; // docId

  // we may need an unnamed column for things that don't have field names
  if (meta.hasNonObject) {
    columnHeaders += '<span class="data-table-header-cell" style="width: ' +
      meta.unnamedWidth * columnWidthPx + 'px;">&nbsp;</span>';
  }

  // header for each column
  Object.keys(meta.topLevelKeys).sort().forEach(function (key, index) {
    var col = index + startSortColumn;
    columnHeaders += '<span *ngIf="dec.options.show_tables" class="data-table-header-cell" (click)="sortTable($event,' +
      col + ')" style="width: ' + meta.columnWidths[key] * columnWidthPx + 'px;"';

    // for column names too big to fit, add a tooltip
    if (mySanitize(key).length > 25 * meta.columnWidths[key])
      columnHeaders += ' title="' + mySanitize(key) + '" ';

    columnHeaders += 'data-colname="' + mySanitize(key) + '">' + mySanitize(key) +
      '<span class="caret-subspan icon" *ngIf="isSorted(' + col + ')" [ngClass]="' +
      "{'fa-caret-down': sortForward(), 'fa-caret-up': !sortForward()}" + '"></span></span>';
  });
  columnHeaders += '</div>';

  return (columnHeaders);
}

//
// top-level: we have an array of objects, each with a 'data' and 'id' field
//

// MAGIC NUMBER: how many pixels wide for each column
var columnWidthPx = 150;

function makeHTMLTopLevel() {
  var result = '';
  var max_length = 200; // the old doc editor truncated the JSON at 200 chars, so we will also
  var max_items = 1000; // maximum number of items we want to render at once

  // we expect an array of objects, which we turn into an HTML table.

  // if the array is empty, say so
  if (!_.isArray(tdata) || tdata.length == 0 || !tdata.find(row => row.data !== This.qwConstantsService.docNotFoundError))
    return ('<p class="error">No Results</p>');

  var topLevelKeys = meta.topLevelKeys;
  var columnWidths = meta.columnWidths;
  var tooManyItemsInResult = meta.totalCount > max_items;

  //
  // for each object in the array, output all the possible column values
  //

  for (var row = 0; row < tdata.length; row++) {
    // handle JSON docs
    if (tdata[row] && tdata[row].id && tdata[row].meta && tdata[row].meta.type === "json") {// they'd all better have these
      var docTooBig = tdata[row].docSize > 1024 * 1024;
      var docWayTooBig = tdata[row].docSize > 10 * 1024 * 1024;
      var tooManyFieldsInDoc = meta.rowCounts[row] > 500;
      var docError = tdata[row].error;
      var formName = 'row' + row + 'Form';
      var pristineName = formName + '.pristine';
      var setPristineName = formName + '.markAsPristine';
      var invalidName = formName + '.invalid';

      result += '<form #' + formName + '="ngForm" name="' + formName + '" style="width: ' + (meta.totalWidth + meta.unnamedWidth + 3.25) * columnWidthPx + 'px" ' +
        ' *ngIf="dec.options.current_result[' + row + ']"' +
        ' (submit)="dec.updateDoc(' + row + ',' + formName + ')">' +
        '<fieldset class="doc-editor-fieldset" [disabled]="!dec.upsertAllowed()">' +
        '<div class="doc-editor-row" ' +
        '[hidden]="dec.options.current_result[' + row + '].deleted">'; // new row for each object

      result += '<span class="doc-editor-cell" style="width:' + columnWidthPx * 1.25 + 'px"> ' +

        '<a class="btn square-button" ' +
        '[attr.disabled]="' + invalidName + ' || ' + docError + ' || !dec.upsertAllowed() ? 1 : null" ' +
        '(click)="dec.editDoc(' + row + ')" ' +
        'title="Edit document as JSON"><span class="icon fa-pencil"></span></a>' +

        '<a class="btn square-button" ' +
        '[attr.disabled]="' + invalidName + ' || ' + docError + ' || !dec.upsertAllowed() ? 1 : null" ' +
        '(click)="dec.copyDoc(' + row + ',' + formName + ')" ' +
        'title="Make a copy of this document"><span class="icon fa-copy"></span></a>' +

        '<a class="btn square-button" ' +
        '[attr.disabled]="!dec.deleteAllowed() || ' + docError + '" ' +
        '(click)="dec.deleteDoc(' + row + ')" ' +
        'title="Delete this document"><span class="icon fa-trash"></span></a>' +

        '<a class="btn square-button" ' +
        '[attr.disabled]="' + pristineName + ' || ' + invalidName + ' || ' + docError + '" ' +
        '(click)="dec.updateDoc(' + row + ',' + formName + ')" ' +
        'title="Save changes to document"><span class="icon fa-save"></span></a>' +

        '</span>';

      // put the meta().id in the next column
      result += '<span class="doc-editor-cell" style="width:' + columnWidthPx * 2 + 'px">';

      if (!docWayTooBig)
        result += '<a (click)="dec.editDoc(' + row + ', !dec.upsertAllowed())">';
      else
        result += '<a>';

      result += mySanitize(tdata[row].id);

      if (docWayTooBig)
        result += ' <span class="icon fa-warning orange-3" ' +
          'title="\'Document is too large for editing in the browser: ' + Math.round(tdata[row].docSize * 10 / (1024 * 1024)) / 10 + 'MB.\'"' +
          'placement="right"><span class="icon fa-circle-thin fa-stack-2x"></span></span>';
      else if (docTooBig)
        result += ' <span class="icon fa-warning orange-3" ' +
          'title="\'Document is ' + Math.round(tdata[row].docSize * 10 / (1024 * 1024)) / 10 + 'MB, editing will be slow.\'"' +
          'placement="right"></span>';
      else if (tdata[row].rawJSONError)
        result += ' <span class="icon fa-warning orange-3" *ngIf="dec.options.show_tables"' +
          'title="\'Error checking document for numbers too long to edit. Tabular editing not permitted. ' +
          tdata[row].rawJsonError + '\'"' +
          'placement="right" tooltip-append-to-body="true" tooltip-trigger="mouseenter"></span>';
      else if (tdata[row].rawJSON)
        result += ' <span class="icon fa-warning orange-3" *ngIf="dec.options.show_tables"' +
          'title="\'Document contains numbers too large for tabular editing, click doc id to edit as JSON .\'"' +
          'placement="right" tooltip-append-to-body="true" tooltip-trigger="mouseenter"></span>';
      result += '</a>';
      result += '</span>';

      // if we have unnamed items like arrays or primitives, they go in the next column
      if (meta.hasNonObject && !tooManyFieldsInDoc) {
        result += '<span *ngIf="dec.options.show_tables" class="doc-editor-cell" style="width:' +
          meta.unnamedWidth * columnWidthPx + 'px">';

        // if this row is a subarray or primitive, put it here
        var data = tdata[row].data;
        if (_.isArray(data) || isPrimOrNull(data)) {
          var childSize = {width: 1};
          result += makeHTMLtable(data, '[' + row + '].data', childSize);
        }

        result += '</span>';
      }

      // now the field values, if we are showing tables, but only if we have a non-null document

      if (_.isPlainObject(tdata[row].data)) {
        if (tooManyItemsInResult)
          result += ' <span class="icon fa-warning orange-3" *ngIf="dec.options.show_tables" ' +
            'title="Too many fields in result set for field editing. Limit result size or click ID to edit document."' +
            'placement="right"></span>';
        else if (tooManyFieldsInDoc)
            result += ' <span class="icon fa-warning orange-3" *ngIf="dec.options.show_tables" ' +
              'title="Document too complex for field editing, click ID to edit in dialog instead."' +
              'placement="right"></span>';
        else
          Object.keys(meta.topLevelKeys).sort().forEach(function (key, index) {
            var item = tdata[row].data[key];
            var childSize = {width: 1};
            var disabled = !!tdata[row].rawJSON || docTooBig || docError || key.indexOf('"') > -1;
            var childHTML = (item || item === 0 || item === "" || item === false) ?
              makeHTMLtable(item, '[' + row + '].data[\'' + mySanitizeQuotes(key) + '\']', childSize, disabled) : '&nbsp;';
            result += '<span *ngIf="dec.options.show_tables" class="doc-editor-cell" style="width: ' +
              columnWidths[key] * columnWidthPx + 'px;">' + childHTML + '</span>';
          });
      }

      // when not showing tables, show a truncated version of the JSON
      var json = tdata[row].rawJSON || JSON.stringify(tdata[row].data);
      if (json.length > max_length)
        json = json.substring(0, max_length) + '...';
      result += '<span *ngIf="!dec.options.show_tables" class="doc-editor-cell" style="width: ' + 5 * columnWidthPx + 'px;">' +
          '{{dec.options.current_result[' + row + '].display_json}}</span>';


      // for some reason I couldn't get the form from $scope, so the following acts as a sentinel that I can search for
      // to see if anything changed in any form of the editor
      result += '<span id="somethingChangedInTheEditor" *ngIf="!' + pristineName + '"></span>';

      result += '</div></fieldset></form>'; // end of the row for the top level object
    }

    // what to show for BINARY documents? They're not editable
    else if (tdata[row].meta && tdata[row].meta.type === "base64") {
      result += '<form name="' + formName + '">' + '<div class="doc-editor-row" ' +
        '*ngIf="!dec.options.current_result[' + row + '].deleted">'; // new row for each object

      // span where the buttons would go, all disabled except include delete
      result += '<span class="doc-editor-cell" style="width:' + columnWidthPx * 1.25 + 'px"> ' +
        '<a class="btn square-button" (click)="dec.editDoc(' + row + ',true)"><span class="icon fa-eye"></span></a>' +

        '<a class="btn square-button" [attr.disabled]="true"><span class="icon fa-copy"></span></a>' +

        '<a class="btn square-button" (click)="dec.deleteDoc(' + row + ')" ' +
        'title="Delete this document"><span class="icon fa-trash"></span></a>' +

        '<a class="btn square-button" [attr.disabled]="true"><span class="icon fa-save"></span></a>' +

        '</span>';

      // and the id and metadata
      result += '<span class="doc-editor-cell" style="width: ' + 2 * columnWidthPx +
        'px;"><span '
      if (tdata[row].meta || tdata[row].xattrs)
        result += 'class="cursor-pointer" title="{{getTooltip(' + row + ')}}" ' +
          'placement="auto bottom" tooltip-is-open="showTT' + row + ' && !dec.hideAllTooltips" tooltip-entooltip-append-to-body="true" ' +
          'tooltip-trigger="none" (click)="showTT' + row + ' = !showTT' + row + '"';
      result += '><a (click)="dec.editDoc(' + row + ',true)">' + mySanitize(tdata[row].id) + '</a></span></span>';

      var binary = tdata[row].base64 ? tdata[row].base64.substring(0, 150) : "base64 not available";
      binary = mySanitize(JSON.stringify(binary));
      if (tdata[row].base64 && tdata[row].base64.length > 150)
        binary += "...";

      //console.log("Got row: " + JSON.stringify(data[row]));

      result += '<span class="doc-editor-cell" style="width: 100%;">Binary Document, ' + binary + '</span>';

      result += '</div></form>'; // end of the row for the top level object
    }
  }

  //console.log("After header, loop: " + result);


  // done with array, close the table
  //result = '<div class="data-table" style="width: ' + (totalWidth+3)*(columnWidthPx+10) + 'px; overflow: auto">'
  //+ result + '</div>';

  return (result);
}

function getTooltip(row) {
  var meta = {};
  if (tdata[row].data)
    meta.doc_size = JSON.stringify(tdata[row].data).length;
  meta.meta = tdata[row].meta;
  meta.xattrs = tdata[row].xattrs;
  return ("'" + JSON.stringify(meta, null, 2).replace(/\n/g, '<br>').replace(/ /g, '&nbsp;') + "'");
}


// The data we are showing can contain objects nested inside objects inside objects: turtles
// all the way down. When making a table, a piece of data could be 1 column wide, or 100, or 1000.
// This function recursively traverses a piece of data to figure out how many columns wide it
// will need.

function getColumnArea(item) {
  // arrays are complex
  // - an array of primitives is a vertical list of values.
  // - an array containing a sub-array shows that sub-array as more items in the same column as primitives
  // - an array of objects is shown as a table with a column for each distinct object key
  if (_.isArray(item)) { // arrays will list vertically, find max width of any element
    //console.log("Getting width for array: " + JSON.stringify(item));
    let namedWidth = 0;
    let nameWidthMap = {}; // arrays of objects are rendered as tables, remember the max width of each column
    let unnamedWidth = 0;
    let count = 0;
    for (let i = 0; i < item.length; i++) {

      // unnamed column: prim or nested array
      if (isPrimOrNull(item[i]) || _.isArray(item[i])) {
        let elementSize = getColumnArea(item[i]);
        let elementWidth = elementSize.width;
        count += elementSize.count;

        if (elementWidth > unnamedWidth)
          unnamedWidth = elementWidth;
      }
      // for objects, we need to check each field for the width, since each will get their own column
      else if (_.isPlainObject(item[i])) {
        for (let oKey in item[i]) {
          let colSize = getColumnArea(item[i][oKey]);
          if (!nameWidthMap[oKey] || nameWidthMap[oKey] < colSize.width)
            nameWidthMap[oKey] = colSize.width;
        }
      }
    }

    // now we've been through every item in the array we should have the width of each object field,
    // compute the total
    for (let mapKey in nameWidthMap) {
      namedWidth += nameWidthMap[mapKey];
    }

    //console.log("   got array width for: " + JSON.stringify(item) + ' as ' + namedWidth + ' and ' + unnamedWidth);
    return ({width: namedWidth + unnamedWidth, height: item.length, count: count});

  } else if (_.isPlainObject(item)) { // for objects we need to sum up columns for each field
    //console.log("Getting width for object: " + JSON.stringify(item));
    var totalWidth = 0;
    var maxHeight = 0;
    var count = 0;
    _.forIn(item, function (value, key) { // for each field
      var itemSize = getColumnArea(value);
      count += itemSize.count;
      totalWidth += itemSize.width;
      if (itemSize.height > maxHeight)
        maxHeight = itemSize.height;
    });

    if (totalWidth == 0)
      totalWidth = 1;

    //console.log("   got object width for: " + JSON.stringify(item) + ' as ' + totalWidth);
    return ({width: totalWidth, height: maxHeight + 1, count: count});
  } else // all primitive types just get 1 column wide.
    return {width: 1, height: 1, count: 1};
}

//
// convenience function - for the most part we treat null values the same
// as primitive types (string, number, boolean), so have a function to detect
// all four
//
function isPrimOrNull(item) {
  return (item == null) || _.isString(item) || _.isNumber(item) || _.isBoolean(item);
}

//recursion in Angular is really inefficient, so we will use a javascript
//routine to convert the object to an HTML representation. It's not true to
//the spririt of Angular, but it was taking 10 seconds or more to render
//a table with tens of thousands of cells

var max_array_len = 100; // don't show arrays longer than this in overly large documents

function makeHTMLtable(object, prefix, totalSize, disabled) {
  var result = '';

  // we might get a simple value to render, or an object, or an array of objects.
  // we need to return the total width of what we render, so the caller, knows
  // how much space to allow
  //
  // if we get an array of objects, it is a sub-table which we turn into an CSS
  // table. the first step is
  // to create the set of columns, by looking at the fields of every object. If the array
  // only has primitives, then we'll output a single column table listing them.
  // If the array is heterogenous, then some rows will be objects, and some rows will
  // be arrays/primitives

  if (_.isArray(object)) {
    // if the array is empty, say so
    if (object.length == 0)
      return ('<div class="ajtd-key">[ ]</div>');

    // find the columns
    var arrayObjCount = 0;
    var arrayArrayCount = 0;
    var arrayPrimCount = 0;
    var itemsKeysToObject = {};
    _.forEach(object, function (item, index) {
      if (_.isPlainObject(item)) {
        arrayObjCount++;
        _.forIn(item, function (value, key) {
          itemsKeysToObject[key] = true;
        });
      } else if (_.isArray(item))
        arrayArrayCount++;
      else
        arrayPrimCount++;
    });

    //
    // special case: an array of primitive types or arrays. output them as a
    // single width vertical list
    //

    if (arrayObjCount == 0) {
      result += '<div>';
      var childSize = {width: 1};

      _.forEach(object, function (item, index) {
        result += makeHTMLtable(item, prefix + '[' + index + ']', childSize, disabled) + '<br>';
        // remember the widest element
        if (childSize.width > totalSize.width)
          totalSize.width = childSize.width;
      });
      result += '</div>';

      return (result);
    }

    // otherwise, we have an array of objects and/or primitives & arrays.
    // Make a table whose columns are the union of all fields in all the objects. If we
    // have a non-object, output it as a full-width cell.
    var keys = itemsKeysToObject;
    //console.log("Got keys: " + JSON.stringify(keys));
    // need to keep track of the widths of each column so the headers can know what size to be
    let arrayColumnWidths = {};
    let unnamedWidth = 0; // width for non-field values, which don't have a name
    _.forIn(keys, function (value, key) { // set default width for each column
      arrayColumnWidths[key] = 1;
    });

    totalSize.width = 0;

    //
    // to lay out the table, we need to get the max width for each column of each row
    //

    _.forEach(object, function (item, index) {
      // limit these arrays to 100 items
      if (index > max_array_len)
        return (false);
      // if the row is an array or primitive, compute the width for the unnamed column
      if (_.isArray(item) || isPrimOrNull(item)) {
        var width = getColumnArea(item).width;
        if (!unnamedWidth || width > unnamedWidth)
          unnamedWidth = width;
      } else if (_.isPlainObject(item)) {
        // if it's an empty object, just say so
        if (_.keys(item).length > 0)
          _.forIn(keys, function (b, key) {
            var value = item ? item[key] : null;

            if (value && getColumnArea(value).width > arrayColumnWidths[key])
              arrayColumnWidths[key] = getColumnArea(value).width;
          });
      }
    });
    //console.log("  column widths: " + JSON.stringify(arrayColumnWidths));

    // now we know the widths of each key, compute total width
    for (var key in arrayColumnWidths) {
      totalSize.width += arrayColumnWidths[key];
    }
    if (unnamedWidth)
      totalSize.width += unnamedWidth;

    //console.log("Got totalWidth: " + totalSize.width);

    // for each object in the array, output all the column (and unnamed) values
    _.forEach(object, function (item, index) {
      // limit these arrays to 100 items
      if (index > max_array_len) {
        result += '<div class="doc-editor-row">Array length ' + object.length +
          ' truncated to ' + max_array_len + ' rows, use JSON editing to see entire array</div>';
        return false;
      }


      result += '<div class="doc-editor-row">'; // new div for each row

      // if there exist unnamed objects in the array, output them in the first column
      if (unnamedWidth) {
        result += '<span class="doc-editor-cell" style="width: ' + unnamedWidth * columnWidthPx + 'px">';

        // is this row an array or primitive?
        if (_.isArray(item) || isPrimOrNull(item)) {
          var childSize = {width: 1};
          result += makeHTMLtable(item, prefix + "[" + index + "]", childSize, disabled);
        }

        result += '</span>';

      }

      if (_.isPlainObject(item)) {
        // if it's an empty object, just say so
        if (_.keys(item).length == 0)
          result += '<span class="doc-editor-cell" style="width: ' + columnWidthPx + 'px">empty object</span>';

        else _.forIn(keys, function (b, key) {
          // not all keys present in all objects, if key not found, add an empty slot
          if (item[key] === undefined) {
            result += '<span class="doc-editor-cell" style="width: ' + columnWidthPx*arrayColumnWidths[key] + 'px"></span>';
            return;
          }

          var value = item ? item[key] : null;

          //console.log("  key: " + key + ", value: " + value);

          // for objects and arrays, make a recursive call
          if (_.isArray(value) || _.isPlainObject(value)) {
            var childSize = {width: 1};
            var childHTML = makeHTMLtable(value, prefix + '[' + index + ']' +
              '[\'' + key + '\']', childSize, disabled);
            result += '<span class="doc-editor-row" style="width: ' + childSize.width * columnWidthPx + 'px;">' + childHTML + '</span>';
          }

          // primitive values also use an input form generated recursively
          else {
            var childSize = {width: 1};
            var childHTML = makeHTMLtable(value, prefix + '[' + index + ']' +
              '[\'' + key + '\']', childSize, disabled);
            result += '<span class="doc-editor-row" style="width: ' + childSize.width * columnWidthPx + 'px;">' + childHTML + '</span>';
          }

        });

      }

      // if the item wasn't an object, add filler cells for the empty fields
      else _.forIn(keys, function (b, key) {
        result += '<span class="doc-editor-cell empty" style="width: ' + columnWidthPx + 'px"></span>';
      });

      result += '</div>'; // end the row
    });

    // done with the array of values, now know how big each column header should be
    let columnHeaders = '';
    let arrayWidth = 0;
    // if we have unnamed items, leave a blank-headered column for them
    if (unnamedWidth) {
      columnHeaders += '<span class="data-table-header-cell" style="width: ' +
        unnamedWidth * columnWidthPx + 'px;">&nbsp;</span>';
      arrayWidth += unnamedWidth * columnWidthPx;
    }

    // now column headers for fields we saw in the array
    _.forIn(keys, function (value, key) {
      columnHeaders += '<span class="data-table-header-cell" style="width: ' +
        arrayColumnWidths[key] * columnWidthPx + 'px;">' + mySanitize(key) + '</span>';
      arrayWidth += arrayColumnWidths[key] * columnWidthPx;
      //console.log(`after key ${key} got width ${arrayWidth}`);
    });

    // finish the table
    result = '<div class="data-table-editor-header-row" style="width: ' + arrayWidth + 'px">' +
      columnHeaders + '</div>' + result;
  }

    //
    // instead of an array, we might get an object, create a table and iterate over the fields
    // what is the right way to do this? An object could be shown as a horizontal table, with
    // one column per field. It also could be shown as a vertical table, with one row per field.
    // For the purposes of an editor, we will make the sub-object horizontal, to offset the
    // field names in a title bar
  //

  else if (_.isPlainObject(object)) {

    var columnWidths = {};

    var dataRow = '<div class="doc-editor-row">';

    // figure out the widths of each column
    _.forIn(object, function (value, key) {
      var childSize = {width: 1};
      var childHTML = makeHTMLtable(value, prefix + "['" + mySanitizeQuotes(key) + "']", childSize, disabled);
      if (!columnWidths[key] || childSize.width > columnWidths[key])
        columnWidths[key] = childSize.width;
      dataRow += '<span class="doc-editor-cell" style="width: ' + columnWidths[key] * columnWidthPx + 'px">' + childHTML + '</span>';
    });
    dataRow += '</div>';

    // row of field names
    var totalWidth = 0;
    var columnHeaders = '<div class="data-table-editor-header-row">';
    _.forIn(object, function (value, key) {
      columnHeaders += '<span class="doc-editor-cell" style="width: ' +
        columnWidths[key] * columnWidthPx + 'px;">' + mySanitize(key) + '</span>';
      totalWidth += columnWidths[key];
    });
    columnHeaders += '</div>';

    totalSize.width = totalWidth;
    result += columnHeaders + dataRow;
  }

  //it's also possible we were passed a primitive value, in which case just put it in a div

  else {
    var model = ' [(ngModel)]="results' + prefix + '" name="' + mySanitize(prefix) + '" ';
    var inputStyle = ' style="width: ' + (columnWidthPx - 10) + 'px; margin-left: 0px"';
    var no_edit = disabled ? ' [disabled]="true" ' : '';
    if (disabled && prefix.indexOf('&#34') != -1)
      no_edit += ' title="Tabular editing does not support field names with embedded quotes. Edit entire document instead." ';

    //result += '{{results' + prefix + '}}';
    if (_.isNumber(object))
      result += '<input type="number" step="any" ' + model + inputStyle + no_edit + '>';
    else if (_.isBoolean(object))
      result += '<select ' + model + inputStyle + no_edit +
        '><option *ngFor="let c of [{n: \'false\', v: false}, {n:\'true\', v: true}]" [ngValue]="c.v">{{c.n}}</option></select>';

    // can't edit incredibly long strings without the browser barfing
    else if (object && object.length > 1024 * 512)
      result += '<div class="text-center"><span class="icon fa-exclamation-triangle" ' +
        'title="\'Field value too large to edit in spreadsheet mode. Try editing as JSON.\'"' +
        'placement="right" tooltip-append-to-body="true" tooltip-trigger="mouseenter">' +
        '</span></div>';
    else if (object == null)
      result += 'null';
    else
      result += '<input type="text" ' + model + inputStyle + no_edit + '/>';
  }

  return (result);
};
