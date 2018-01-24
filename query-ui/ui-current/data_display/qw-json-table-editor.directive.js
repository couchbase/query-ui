/**
 * Make a table of editable cells, each row corresponding to a document, each
 * with a meta-id that we want to show as well.
 *
 * This is a version of the qwJsonTableEditor but customized to deal with the
 * output of one particular query:
 *
 *  select meta().id, * from <bucket name> data [optional where, limit clauses]
 *
 *  As a result, we expect an array of objects, each of which has a 'data' field
 *  (pointing to the document contents) and an 'id' field, which contains the
 *  meta_id. If the user makes changes and clicks the "update" button, the
 *  meta_id is used to update the appropriate document in Couchbase.
 *
 */
/* global _, angular */
(function() {

  'use strict';
  angular.module('qwJsonTableEditor', [])
  .directive('qwJsonTableEditor', ['$compile','$timeout',getTableEditor]);

  function getTableEditor($compile,$timeout) {
    return {
      restrict: 'E',
//    scope: { data: '=qwJsonTableEditor' },
      scope: { data: '=data', controller: '=controller' },
      template: '<div></div>',
      link: function (scope, element) {

        scope.$watch('data', function (json) {

          // start with an empty div, if we have data convert it to HTML
          var wrapper = '<div class="data-table-wrapper">{}</div>';
          var table;
          htmlElement = element;

          var content = "<div>{}</div>";

          // do we have data to work with?
          if (json && _.isArray(json)) {
            data = json;
            scope.results = json;
            scope.dec = scope.controller;
            meta = getMetaData(json);

            // make the table header with the top-level fields
            header = angular.element(createHTMLheader(meta));
            var startSortColumn = meta.hasNonObject ? 3 : 2; // don't allow sorting on first few columns
            for (var i=startSortColumn; i < header[0].childNodes.length; i++) {
              header[0].childNodes[i].addEventListener("click",function() {
                sortTable(this,scope,$compile,$timeout);
              },false);
            }

            wrapper = '<div class="data-table-wrapper show-scrollbar"></div>';

            var tableHTML = makeHTMLTopLevel(json,meta);
            table = angular.element(tableHTML);
          }

          //
          // otherwise show error message
          //

          else {
            wrapper = '<div class="data-table-wrapper">Unable to process data, see log.</div>';
            console.log("Unable to create tabular view for data:");
            console.log(JSON.stringify(data,null,4));
          }

          // even if the json was empty, we have a wrapper element
          wrapperElement = angular.element(wrapper);
          if (table) {
            //wrapperElement.append(table);
            $compile(table)(scope, function(compiledTable) {wrapperElement.append(compiledTable)}); // need to compile to link generated HTML with angular
          }

          // clear out our element. If we have a header add it, then add the wrapper
          htmlElement.empty();
          if (header) {
            htmlElement.append(header);
          }
          htmlElement.append(wrapperElement);

          // sync scrolling between the header and the main table
          // listen on scrolling in the data window
          wrapperElement[0].addEventListener("scroll",function() {
            if (header) {
              header[0].scrollLeft = wrapperElement[0].scrollLeft;
            }
          });

          // also listen on horizontal scrolling in the header, to keep the data in sync
          if (header) header[0].addEventListener("scroll",function() {
            wrapperElement[0].scrollLeft = header[0].scrollLeft
          });


        }); // end scope watch
      }
    };
  }

  // globals used for sorting, etc.

  var data;           // all our data
  var meta;           // metadata on data sizing
  var htmlElement;    // the html element, which we need to change after sorting
  var header;         // the html element for the table header
  var wrapperElement; // the element that wraps the table (but not the header)

  //
  // if the user clicks on a top-level column header, sort the rows, but only after
  // checking  with the user and reverting any changes in progress
  //

  var sortField;      // field to sort by, if any
  var prevSortElem;   // previous header element, for changing sort style
  var sortForward = true;

  function sortTable(spanElem,scope,$compile,$timeout) {
    //console.log("sortBy: " + spanElem.innerText + ", meta: " + meta);
    // if it's a new field, sort forward by that field
    if (spanElem !== prevSortElem) {
      if (prevSortElem)
        prevSortElem.firstElementChild.classList.remove("icon", "fa-caret-down", "fa-caret-up");

      prevSortElem = spanElem;

      sortForward = true;
      sortField = spanElem.innerText;
      spanElem.firstElementChild.classList.add("icon", "fa-caret-down");
    }

    // if they clicked the same field, reverse the sort direction
    else {
      if (sortForward) {
        spanElem.firstElementChild.classList.remove("fa-caret-down");
        spanElem.firstElementChild.classList.add("fa-caret-up");
      }
      else {
        spanElem.firstElementChild.classList.remove("fa-caret-up");
        spanElem.firstElementChild.classList.add("fa-caret-down");
      }
      sortForward = !sortForward;

    }

    // now sort the data, clear the div, and render the visible region

    meta["outerKey"] = "data";
    data.sort(compare);
    wrapperElement.empty();
    var tableHTML = makeHTMLTopLevel(data,meta);
    var table = angular.element(tableHTML);
    if (table) {
      $compile(table)(scope,function(compiledTab) {
        wrapperElement.append(compiledTab);
        scope.$applyAsync(function() {});
      }); // must compile to link generated HTML and angular
    }
  }

  // compare two rows based on the sort field
  function compare(a,b) {
    return(myCompare(a,b,sortField,meta));
  }

  // since we may need to sort subobjects, make our comparison general
  function myCompare(a,b,sortField,meta) {
    var val1,val2;

    if (meta && meta.outerKey) {
      val1 = a[meta.outerKey][sortField];
      val2 = b[meta.outerKey][sortField];
    }
    else {
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
        return((val1 - val2) * direction);
      if (_.isBoolean(val1))
        return(val1 == val2 ? 0 : (val1 ? direction : 0));
      if (_.isString(val1))
        return (val1.localeCompare(val2) * direction);

      // typeof array and object is the same, need to see which it is
      if (_.isArray(val1)) {
        if (!_.isArray(val2)) // put objects before arrays
          return(-1 * direction);
        else {
          // how to compare arrays? compare each element until a difference
          for (var i=0; i < Math.min(val1.length,val2.length); i++) {
            var res = myCompare(val1,val2,i);
            if (res != 0)
              return(res);
          }
          // if one array was shorter, put it first
          if (i < val2.length)
            return(1 * direction);
          else if (i < val1.length)
            return(-1 * direction);
          else
            return(0); // two were entirely equal
        }
      }
      if (_.isPlainObject(val1)) { // to compare objects, compare the fields
        for (var key in val1) {
          var res = myCompare(val1,val2,key);
          if (res != 0)
            return(res);
        }
        return(0);
      }
      console.log("shouldn't get here: " + JSON.stringify(val1) + "," + JSON.stringify(val2));
      return(0);
    }

    // types of two values are not equal. Order by bool, number, string, object, array
    if (_.isBoolean(val1))
      return(-1 * direction);
    if (_.isNumber(val1))
      return(-1 * direction);
    if (_.isString(val1))
      return(-1 * direction);
    if (_.isPlainObject(val1))
      return(-1 * direction);

    console.log("shouldn't get here2" +
        ": " + JSON.stringify(val1) + "," + JSON.stringify(val2));

    return(0);
  }


  // avoid HTML injection by changing tag markers to HTML

  var lt = /</gi;
  var gt = />/gi;
  var mySanitize = function(str) {
    if (!str) return (''); else return(str.replace(lt,'&lt;').replace(gt,'&gt;'));
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

    var maxWidth = 500;
    var topLevelKeys = {};
    var columnWidths = {};
    var totalWidth = 0;
    var hasNonObject = false;
    var unnamedWidth;
    var rowWidths = [];
    var truncated = false; // did we have to leave out
    for (var row=0; row < object.length; row++)
      if (object[row].data && object[row].id && object[row].meta && object[row].meta.type === "json") {
        //console.log("row: " + row + ": " + JSON.stringify(object[row].data));
        var data = object[row].data;
        // if the data is a sub-array, or primitive type, they will go in an unnamed column,
        // and figure out how much space it needs
        if (_.isArray(data) || _.isString(data) || _.isNumber(data) || _.isBoolean(data)) {
          hasNonObject = true;
          var width = getColumnWidth(data);
          rowWidths[row] = width;
          if (!unnamedWidth || width > unnamedWidth)
            unnamedWidth = width;
        }

        // otherwise it's an object, loop through its keys
        else _.forEach(object[row].data, function (value, key) {
          topLevelKeys[key] = true;
          // see how much space this value requires, remember the max
          var width = getColumnWidth(value);
          rowWidths[row] = width;
          if (!columnWidths[key] || width > columnWidths[key])
            columnWidths[key] = width;
        });
      }

    _.forIn(topLevelKeys, function(value,key) {
      totalWidth += columnWidths[key];
    });

    // if the total width is > 1000 columns, truncate the data to be presented
    if (totalWidth > maxWidth) {
      var truncatedKeys = {};
      var newWidth = 0;
      _.forIn(topLevelKeys, function(value,key) {
        if ((newWidth + columnWidths[key]) < maxWidth) {
          truncatedKeys[key] = true;
          newWidth += columnWidths[key];
        }
      });

      truncated = true;
      totalWidth = newWidth;
      topLevelKeys = truncatedKeys;
    }


    return({topLevelKeys: topLevelKeys, columnWidths: columnWidths, totalWidth: totalWidth,
      hasNonObject: hasNonObject, unnamedWidth: unnamedWidth, rowWidths: rowWidths, truncated: truncated});
  }

  //
  // make a header for the table that will be fixed
  //

  function createHTMLheader(meta) {
    //
    // We have widths for each column, so we can create the header row
    //
    var columnHeaders = '<div class="data-table-header-row">';
    columnHeaders += '<span class="data-table-header-cell" style="width:' + columnWidthPx*1.25 + 'px">';
    if (meta.truncated)
      columnHeaders += 'Docs too large, truncated.';
    columnHeaders += '</span>';
    columnHeaders += '<span class="data-table-header-cell" style="width:' + columnWidthPx*2 + 'px">id</span>';

    // we may need an unnamed column for things that don't have field names
    if (meta.hasNonObject) {
      columnHeaders += '<span class="data-table-header-cell" style="width: ' +
        meta.unnamedWidth*columnWidthPx + 'px;">&nbsp;</span>';
    }

    // if we have non-objects, leave a separate column just for them with no header
    Object.keys(meta.topLevelKeys).sort().forEach(function(key,index) {
      columnHeaders += '<span class="data-table-header-cell" style="width: ' +
      meta.columnWidths[key]*columnWidthPx + 'px;">' + mySanitize(key) +'<span class="caret-subspan"></span></span>';
    });
    columnHeaders += '</div>';

    return(columnHeaders);
  }

  //
  // top-level: we have an array of objects, each with a 'data' and 'id' field
  //

  // MAGIC NUMBER: how many pixels wide for each column
  var columnWidthPx = 150;

  function makeHTMLTopLevel(object, meta) {
    var result = '';

    // we expect an array of objects, which we turn into an HTML table.

    // if the array is empty, say so
    if (!_.isArray(object) || object.length == 0)
      return('<p class="error">No Results</p>');


    var topLevelKeys = meta.topLevelKeys;
    var columnWidths = meta.columnWidths;

    //
    // for each object in the array, output all the possible column values
    //

    for (var row=0; row < object.length; row++) {
      // handle JSON docs
      if (object[row].data && object[row].id && object[row].meta && object[row].meta.type === "json")  {// they'd all better have these
        var formName = 'row' + row + 'Form';
        var pristineName = formName + '.$pristine';
        var setPristineName = formName + '.$setPristine';
        var invalidName = formName + '.$invalid';
        result += '<form name="' + formName + '" style="width: ' + (meta.totalWidth + 3.25)*columnWidthPx + 'px" ' +
        ' ng-submit="dec.updateDoc(' + row +',' + formName + ')">' +
        '<div class="data-table-editor-row" ' +
        'ng-if="!dec.options.current_result[' + row + '].deleted">'; // new row for each object

        // button to update record in the first column
        result += '<span class="data-table-cell" style="width:' + columnWidthPx*1.25 + 'px"> ' +
        '<a class="btn qw-doc-editor" ' +
        'ng-disabled="' + pristineName + ' || '+ invalidName + '" ' +
        'ng-click="dec.updateDoc(' + row +',' + formName + ')" ' +
        'title="Save changes to document"><span class="icon fa-save qw-editor-btn"></span></a>' +

        '<a class="btn qw-doc-editor" ' +
        'ng-disabled="' + invalidName + '" ' +
        'ng-click="dec.copyDoc(' + row +',' + formName +')" ' +
        'title="Make a copy of this document"><span class="icon fa-copy qw-editor-btn"></span></a>' +

        '<a class="btn qw-doc-editor" ' +
        'ng-disabled="' + invalidName + '" ' +
        'ng-click="dec.editDoc(' + row +')" ' +
        'title="Edit document as JSON"><span class="icon fa-edit qw-editor-btn"></span></a>' +

        '<a class="btn qw-doc-editor" ' +
        'ng-click="dec.deleteDoc(' + row +')" ' +
        'title="Delete this document"><span class="icon fa-trash qw-editor-btn"></span></a>' +

        //        '<span ng-if="!dec.options.queryBusy">Update</span>' +
//      '<span ng-if="dec.options.queryBusy">Updating</span>' +
//      '</button></span>';
        '</span>';

        // put the meta().id in the next column
        result += '<span class="data-table-cell" style="width:' + columnWidthPx*2 + 'px"><span class="cursor-pointer" ';
        if (object[row].meta)
          result += 'uib-tooltip-html="\'' + getTooltip(object[row].meta) + '\'" ' +
          'tooltip-placement="top" tooltip-append-to-body="true" tooltip-trigger="\'mouseenter\'"';
        result += '>' + mySanitize(object[row].id) + '</span></span>';

        // if we have unnamed items like arrays or primitives, they go in the next column
        if (meta.hasNonObject) {
          result += '<span class="data-table-cell" style="width:' + meta.rowWidths[row]*columnWidthPx + 'px">';

          // if this row is a subarray or primitive, put it here
          var data = object[row].data;
          if (_.isArray(data) || _.isString(data) || _.isNumber(data) || _.isBoolean(data)) {
            var childSize = {width: 1};
            result += makeHTMLtable(data,'[' + row + '].data',childSize);
          }

          result += '</span>';
        }

        // now the field values

        //_.forIn(topLevelKeys, function (value, key) {
        Object.keys(meta.topLevelKeys).sort().forEach(function(key,index) {
          var item = object[row].data[key];
          var childSize = {width: 1};
          var childHTML = (item || item === 0 || item === "") ?
              makeHTMLtable(item,'[' + row + '].data[\''+ key + '\']', childSize) : '&nbsp;';
              result += '<span class="data-table-cell" style="width: ' + columnWidths[key]*columnWidthPx  + 'px;">'
              + childHTML + '</span>';
        });

        // for some reason I couldn't get the form from $scope, so the following acts as a sentinel that I can search for
        // to see if anything changed in any form of the editor
        result +=  '<span id="somethingChangedInTheEditor" ng-if="!' + pristineName + '"></span>';

        result += '</div></form>'; // end of the row for the top level object
      }

      // what to show for BINARY documents? They're not editable
      else if (object[row].meta && object[row].meta.type === "base64") {
        result += '<form name="' + formName + '">' +
        '<div class="data-table-editor-row">'; // new row for each object

        // empty span where the buttons would go
        result += '<span class="data-table-cell" style="width: ' + 1.25*columnWidthPx  + 'px;"> ' +
        '</span>';

        // and the id and metadata
        result += '<span class="data-table-cell" style="width: ' + 2*columnWidthPx  + 'px;"><span class="cursor-pointer" ';
        if (object[row].meta)
          result += 'uib-tooltip-html="\'' + getTooltip(object[row].meta) + '\'" ' +
          'tooltip-placement="top" tooltip-append-to-body="true" tooltip-trigger="\'mouseenter\'"';
        result += '>' + mySanitize(object[row].id) + '</span></span>';

        // finally a message saying that we can't edit binary objects, followed by dummy columns
        var first = true;
        _.forIn(topLevelKeys, function (value, key) {
          result += '<span class="data-table-cell" style="width: ' + columnWidths[key]*columnWidthPx + 'px;">';
          if (first) {
            result += 'Binary Document';
            first = false;
          }
          result += '</span>';
        });
        // if we only have binary documents, there will be no topLevelKeys, so add the binary message
        if (_.keys(topLevelKeys).length == 0)
          result += '<span class="data-table-cell" style="width: ' + columnWidthPx + 'px;">Binary Document</span>';

        result += '</div></form>'; // end of the row for the top level object
      }
    }

    //console.log("After header, loop: " + result);


    // done with array, close the table
    //result = '<div class="data-table" style="width: ' + (totalWidth+3)*(columnWidthPx+10) + 'px; overflow: auto">'
    //+ result + '</div>';

    return(result);
  }

  function getTooltip(meta) {
    var result = "";

    if (meta.cas)
      result += 'cas: ' + meta.cas + '<br>';
    if (meta.expiration)
      result += 'expiration: ' + meta.expiration + '<br>';
    if (meta.flags)
      result += 'flags: ' + meta.flags + '<br>';
    if (meta.type)
      result += 'type: ' + mySanitize(meta.type);

    return result;
  }

  // The data we are showing can contain objects nested inside objects inside objects: turtles
  // all the way down. When making a table, a piece of data could be 1 column wide, or 100, or 1000.
  // This function recursively traverses a piece of data to figure out how many columns wide it
  // will need.

  function getColumnWidth(item) {
    // arrays are complex - an array of primitives is a vertical list of values, but a mixed
    // array of objects and primitives is shown as a table, with an unnamed column for the
    // primitives
    if (_.isArray(item)) { // arrays will list vertically, find max width of any element
      //console.log("Getting width for array: " + JSON.stringify(item));
      var namedWidth = 1;
      var unnamedWidth = 0;
      for (var i=0; i < item.length; i++) {
        var elementWidth = getColumnWidth(item[i]);

        // is the item named (object) or unnamed (prim or array)
        if (_.isArray(item[i]) || _.isString(item[i]) || _.isNumber(item[i]) || _.isBoolean(item[i])) {
          if (elementWidth > unnamedWidth)
            unnamedWidth = elementWidth;
        }
        else {
          if (elementWidth > namedWidth)
            namedWidth = elementWidth;
        }
      }

      //console.log("   got array width: " + namedWidth + unnamedWidth);
      return(namedWidth + unnamedWidth);
    }

    else if (_.isPlainObject(item)) { // for objects we need to sum up columns for each field
      //console.log("Getting width for object: " + JSON.stringify(item));
      var totalWidth = 0;
      _.forIn(item, function (value, key) { // for each field
        totalWidth += getColumnWidth(value);
      });

      if (totalWidth == 0)
        totalWidth = 1;

      //console.log("   got object width: " + totalWidth);
      return(totalWidth);
    }

    else // all primitive types just get 1 column wide.
      return 1;
  }


  //recursion in Angular is really inefficient, so we will use a javascript
  //routine to convert the object to an HTML representation. It's not true to
  //the spririt of Angular, but it was taking 10 seconds or more to render
  //a table with tens of thousands of cells

  function makeHTMLtable(object,prefix,totalSize) {
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
        return('<div class="ajtd-key">[]</div>');

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
        }
        else if (_.isArray(item))
          arrayArrayCount++;
        else
          arrayPrimCount++;
      });

      //
      // special case: an array of primitive types or arrays. output them as a
      // single width vertical list
      //

      if (arrayObjCount == 0)  {
        result += '<div>';
        var childSize = {width: 1};

        _.forEach(object, function (item,index) {
          result += makeHTMLtable(item, prefix + '[' + index + ']', childSize) + '<br>';
          // remember the widest element
          if (childSize.width > totalSize.width)
            totalSize.width = childSize.width;
        });
        result += '</div>';

        return(result);
      }

      //
      // another special case: whenever the user does "select * from <bucket>", they
      // get an array of objects with only one field, whose key is the bucket name and
      // whose value is an abject. In that case we get a really ugly table, with a subtable
      // for each row. To work around this, in the case where we found only one column, "peek"
      // inside to allow access to those inner fields
      //

      var innerKeys;
      var fields = Object.keys(itemsKeysToObject);
      if (fields.length == 1) {
        var onlyField = fields[0];

        // loop through the array
        _.forEach(object, function (item, index) {
          // if the item is an object
          if (_.isPlainObject(item[onlyField])) {
            _.forIn(item[onlyField], function (value, key) {
              if (!innerKeys)
                innerKeys = {};
              innerKeys[key] = true;
            });
          }
        });
      }

      // otherwise, we have an array of objects and/or primitives & arrays.
      // Make a table whose columns are the union of all fields in all the objects. If we
      // have a non-object, output it as a full-width cell.
      var keys = (innerKeys ? innerKeys : itemsKeysToObject);

      // need to keep track of the widths of each column so the headers can know what size to be
      var columnWidths = {};
      var unnamedWidth; // width for non-field values, which don't have a name
      _.forIn(keys, function (value, key) { // set default width for each column
        columnWidths[key] = 1;
      });

      totalSize.width = 0;
      // get the max width for each column of each row
      _.forEach(object, function (item, index) {
        // if the row is an array or primitive, compute the width for the unnamed column
        if (_.isArray(item) || _.isString(item) || _.isNumber(item) || _.isBoolean(item)) {
          var width = getColumnWidth(item);
          if (!unnamedWidth || width > unnamedWidth)
            unnamedWidth = width;
        }

        else if (_.isPlainObject(item)) {
          // if we are using innerKeys, get to the inner object
          if (innerKeys)
            item = item[onlyField];

          // if it's an empty object, just say so
          if (_.keys(item).length > 0)
            _.forIn(keys, function(b,key) {
              var value = item ? item[key] : null;

              if (value && getColumnWidth(value) > columnWidths[key])
                columnWidths[key] = getColumnWidth(value);
            });

        }
      });

      // now we know the widths of each key, compute total width
      for (var key in columnWidths) {
        //console.log("For key: " + key + " got width: " + columnWidths[key]);
        totalSize.width += columnWidths[key];
      }
      if (unnamedWidth)
        totalSize.width += unnamedWidth;

      //console.log("Got totalWidth: " + totalSize.width);

      // for each object in the array, output all the column (and unnamed) values
      _.forEach(object, function (item, index) {
        result += '<div class="data-table-editor-row">'; // new div for each row

        // if there exist unnamed objects in the array, output them in the first column
        if (unnamedWidth) {
          result += '<span class="data-table-cell" style="width: ' + unnamedWidth*columnWidthPx + 'px">';

          // is this row an array or primitive?
          if (_.isArray(item) || _.isString(item) || _.isNumber(item) || _.isBoolean(item))
            result += makeHTMLtable(item,prefix + "[" + index + "]");

          result += '</span>';

        }

        if (_.isPlainObject(item)) {
          // if we are using innerKeys, get to the inner object
          if (innerKeys)
            item = item[onlyField];

          // if it's an empty object, just say so
          if (_.keys(item).length == 0)
            result += '<span class="data-table-cell" style="width: ' + columnWidthPx + 'px">empty object</span>';

          else _.forIn(keys, function(b,key) {
            var value = item ? item[key] : null;

            //console.log("  key: " + key + ", value: " + value);

            // for objects and arrays, make a recursive call
            if (_.isArray(value) || _.isPlainObject(value)) {
              var childSize = {width: 1};
              var childHTML = makeHTMLtable(value,prefix + '[' + index + '][\''+ key + '\']',childSize);
              result += '<span class="data-table-editor-row" style="width: '+ childSize.width*columnWidthPx + 'px;">' + childHTML + '</span>';
            }

            // primitive values also use an input form generated recursively
            else {
              var childSize = {width: 1};
              var childHTML = makeHTMLtable(value,prefix + '[' + index + '][\''+ key + '\']',childSize);
              result += '<span class="data-table-editor-row" style="width: '+ childSize.width*columnWidthPx + 'px;">' + childHTML + '</span>';
            }

          });

        }

        // if the item wasn't an object, add filler cells for the empty fields
        else _.forIn(keys, function(b,key) {
          result += '<span class="data-table-cell empty" style="width: ' + columnWidthPx + 'px"></span>';
        });

        result += '</div>'; // end the row
      });

      // done with the array of values, now know how big each column header should be
      var columnHeaders = '';
      var arrayWidth = 0;
      // if we have unnamed items, leave a blank-headered column for them
      if (unnamedWidth) {
        columnHeaders += '<span class="data-table-header-cell" style="width: ' +
          unnamedWidth*columnWidthPx + 'px;">&nbsp;</span>';
        arrayWidth += unnamedWidth * columnWidthPx;
      }

      // now column headers for fields we saw in the array
      _.forIn(keys, function(value,key) {
        columnHeaders += '<span class="data-table-header-cell" style="width: ' +
          columnWidths[key]*columnWidthPx + 'px;">' + mySanitize(key) +'</span>';
        arrayWidth +=  columnWidths[key]*columnWidthPx;
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

      var dataRow = '<div class="data-table-editor-row">';

      // figure out the widths of each column
      _.forIn(object, function(value,key) {
        var childSize = {width: 1};
        var childHTML = makeHTMLtable(value,prefix + "['" + key + "']",childSize);
        if (!columnWidths[key] || childSize.width > columnWidths[key])
          columnWidths[key] = childSize.width;
        dataRow += '<span class="data-table-cell" style="width: ' + columnWidths[key]*columnWidthPx + 'px">' + childHTML + '</span>';
      });
      dataRow += '</div>';

      // row of field names
      var totalWidth = 0;
      var columnHeaders = '<div class="data-table-editor-header-row">';
      _.forIn(object, function(value,key) {
        columnHeaders += '<span class="data-table-cell" style="width: ' +
        columnWidths[key]*columnWidthPx + 'px;">' + mySanitize(key) +'</span>';
        totalWidth += columnWidths[key];
      });
      columnHeaders += '</div>';

      totalSize.width = totalWidth;
      result += columnHeaders + dataRow;
    }

    //it's also possible we were passed a primitive value, in which case just put it in a div

    else {
      var model = ' ng-model="results' + prefix + '" ';
      var inputStyle = ' style="width: ' + (columnWidthPx-10) + 'px; margin-left: 0px"';

      if (_.isNumber(object))
        result += '<input type="number" ' + model + inputStyle + '>';
      else if (_.isBoolean(object))
        result += '<select ' + model + inputStyle +
        ' ng-options="opt.v as opt.n for opt in [{n: \'false\', v: false}, {n:\'true\', v: true}]"></select>';
      else
        result += '<textarea ' + model + inputStyle + '></textarea>';
    }

    return(result);
  };

})();
