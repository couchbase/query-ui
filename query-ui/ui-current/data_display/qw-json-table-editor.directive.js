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
  .directive('qwJsonTableEditor', ['$compile',getTableEditor]);

  function getTableEditor($compile) {
    return {
      restrict: 'E',
//    scope: { data: '=qwJsonTableEditor' },
      scope: { data: '=data', controller: '=controller' },
      template: '<div></div>',
      link: function (scope, element) {

        scope.$watch('data', function (json) {

          // start with an empty div, if we have data convert it to HTML
          var content = "<div>{}</div>";
          if (json) {
            scope.results = json;
            scope.dec = scope.controller;
            //console.log("Results: " + JSON.stringify(json));
            content = '<div class="object_editor">' +
            makeHTMLTopLevel(json) + "</div>";
            //makeHTMLtable(json,"") + "</div>";
          }

          // set our element to use this HTML
          if (true) {
            element.contents().remove();
            var compiledContents = $compile(content);
            compiledContents(scope, function(clone) {
              //console.log("Got clone: " + JSON.stringify(clone));

              element.append(clone);
            });
          }
          else
            element.html(content);

          // the table sorter is supposed to pick up tables automatically, but for some
          // reason it doesn't. Search for result tables and force them to be sortable.

          forEach(document.getElementsByTagName('table'), function(table) {
            if (table.className.search(/\bsortable\b/) != -1 &&
                table.className.search(/\bajtd-table\b/) != -1) {
              sorttable.makeSortable(table);
            }
          });
        });
      }
    };
  }

  // avoid HTML injection by changing tag markers to HTML

  var lt = /</gi;
  var gt = />/gi;
  var mySanitize = function(str) {
    if (!str) return (''); else return(str.replace(lt,'&lt;').replace(gt,'&gt;'));
  };

  //
  // top-level: we have an array of objects, each with a 'data' and 'id' field
  //

  var buttonWidth = 64;
  var idWidth = 200;
  var columnWidth = 150;

  function makeHTMLTopLevel(object) {
    var result = '';

    // we expect an array of objects, which we turn into an HTML table. the first step is
    // to create the set of columns, by looking at the fields of every object. If the array
    // only has primitives, then we'll output a single column table listing them.
    // If the array is heterogenous, then some rows will be objects, and some rows will
    // be arrays/primitives

    if (_.isArray(object)) {
      // if the array is empty, say so
      if (object.length == 0)
        return('<p class="error">No Results</p>');

      //
      // traverse the data to figure out what fields are present in every row, and
      // how many columns are needed by each field
      //

      var topLevelKeys = {};
      var columnWidths = {};
      for (var row=0; row < object.length; row++)
        if (object[row].data && object[row].id && object[row].meta && object[row].meta.type === "json") {
          //console.log("row: " + row + ": " + JSON.stringify(object[row].data));
          _.forEach(object[row].data, function (value, key) {
            topLevelKeys[key] = true;
            // see how much space this value requires, remember the max
            var width = getColumnWidth(value);
            if (!columnWidths[key] || width > columnWidths[key])
              columnWidths[key] = width;
          });
        }

      //
      // We have widths for each column, so we can create the header row
      //
      var totalWidth = 0;
      var columnHeaders = '<div class="cbui-table-header-filled">';
      columnHeaders += '<span class="cbui-table-cell flex-grow-1-25"></span>';
      columnHeaders += '<span class="cbui-table-cell flex-grow-2">id</span>';

      _.forIn(topLevelKeys, function(value,key) {
        columnHeaders += '<span class="cbui-table-cell" style="flex-grow: ' +
          columnWidths[key] + ';">' + mySanitize(key) +'</span>';
        totalWidth += columnWidths[key];
      });
      columnHeaders += '</div>';

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
          result += '<form name="' + formName + '"' +
          ' ng-submit="dec.updateDoc(' + row +',' + setPristineName + ')">' +
          '<div class="cbui-tablerow items-top padding-left-0">'; // new row for each object

          // button to update record in the first column
          result += '<span class="cbui-table-cell flex-grow-1-25"> ' +
          '<a class="btn qw-doc-editor" ' +
          'ng-disabled="' + pristineName + ' || '+ invalidName + '" ' +
          'ng-click="dec.updateDoc(' + row +',' + setPristineName + ')" ' +
          'title="Save changes to document"><span class="icon fa-save qw-editor-btn"></span></a>' +

          '<a class="btn qw-doc-editor" ' +
          'ng-disabled="' + invalidName + '" ' +
          'ng-click="dec.copyDoc(' + row +')" ' +
          'title="Make a copy of this document"><span class="icon fa-copy qw-editor-btn"></span></a>' +

          '<a class="btn qw-doc-editor" ' +
          'ng-disabled="' + invalidName + '" ' +
          'ng-click="dec.editDoc(' + row +')" ' +
          'title="Edit document as JSON"><span class="icon fa-edit qw-editor-btn"></span></a>' +

          '<a class="btn qw-doc-editor" ' +
          'ng-click="dec.deleteDoc(' + row +')" ' +
          'title="Delete this document"><span class="icon fa-trash qw-editor-btn"></span></a>' +

          //        '<span ng-if="!dec.options.queryBusy">Update</span>' +
//        '<span ng-if="dec.options.queryBusy">Updating</span>' +
//        '</button></span>';
          '</span>';

          // put the meta().id in the next column
          result += '<span class="cbui-table-cell wrap break-word flex-grow-2"><span class="cursor-pointer" ';
          if (object[row].meta)
            result += 'uib-tooltip-html="\'' + getTooltip(object[row].meta) + '\'" ' +
            'tooltip-placement="top" tooltip-append-to-body="true" tooltip-trigger="\'mouseenter\'"';
          result += '>' + mySanitize(object[row].id) + '</span></span>';

          _.forIn(topLevelKeys, function (value, key) {
            var item = object[row].data[key];
            var childSize = {width: 1};
            var childHTML = (item || item === 0 || item === "") ?
                makeHTMLtable(item,'[' + row + '].data[\''+ key + '\']', childSize) : '&nbsp;';
                result += '<span class="cbui-table-cell" style="flex-grow: ' + columnWidths[key]  + ';">'
                + childHTML + '</span>';
          });

          result += '</div></form>'; // end of the row for the top level object
        }

        // what to show for BINARY documents? They're not editable
        else if (object[row].meta && object[row].meta.type === "base64") {
          result += '<form name="' + formName + '">' +
          '<div class="cbui-tablerow items-top padding-left-0">'; // new row for each object

          // empty span where the buttons would go
          result += '<span class="cbui-table-cell flex-grow-1-25"> ' +
          '</span>';

          // and the id and metadata
          result += '<span class="cbui-table-cell wrap break-word flex-grow-2"><span class="cursor-pointer" ';
          if (object[row].meta)
            result += 'uib-tooltip-html="\'' + getTooltip(object[row].meta) + '\'" ' +
            'tooltip-placement="top" tooltip-append-to-body="true" tooltip-trigger="\'mouseenter\'"';
          result += '>' + mySanitize(object[row].id) + '</span></span>';

          // finally a message saying that we can't edit binary objects, followed by dummy columns
          var first = true;
          _.forIn(topLevelKeys, function (value, key) {
            result += '<span class="cbui-table-cell" style="flex-grow: ' + columnWidths[key] + ';">';
            if (first) {
              result += 'Binary Document';
              first = false;
            }
            result += '</span>';
          });

          result += '</div></form>'; // end of the row for the top level object
        }
      }

      //console.log("After header, loop: " + result);


      // done with array, close the table
      result = '<div class="cbui-table" style="width: ' + (totalWidth+3)*(columnWidth+10) + 'px; overflow: auto">' + columnHeaders + result + '</div>';
    }

    else if (_.isString(object)) // error messages show up as strings
      result = '<div class="ajtd-key">' + object + '</div>';

    //console.log("Made table: " + result);
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
    if (_.isPlainObject(item)) { // for objects we need to sum up columns for each field
      var totalWidth = 0;
      _.forIn(item, function (value, key) { // for each field
        totalWidth += getColumnWidth(value);
      });

      if (totalWidth == 0)
        totalWidth = 1;
      return(totalWidth);
    }

    else if (_.isArray(item)) { // arrays will list vertically, find max width of any element
      var maxWidth = 1;
      for (var i=0; i < item.length; i++) {
        var elementWidth = getColumnWidth(item[i]);
        if (elementWidth > maxWidth)
          maxWidth = elementWidth;
      }

      return(maxWidth);
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
      // single width field
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
      _.forIn(keys, function (value, key) { // set default width for each column
        columnWidths[key] = columnWidth;
      });


      // for each object in the array, output all the possible column values
      _.forEach(object, function (item, index) {
        result += '<div>'; // new div for each row

        if (_.isPlainObject(item)) {
          // if we are using innerKeys, get to the inner object
          if (innerKeys)
            item = item[onlyField];

          // if it's an empty object, just say so
          if (_.keys(item).length == 0)
            result += '<span class="ajtd-cell flex-grow-1">empty object</span>';

          else _.forIn(keys, function(b,key) {
            var value = item ? item[key] : null;
            //console.log("  key: " + key + ", value: " + value);

            // for objects and arrays, make a recursive call
            if (_.isArray(value) || _.isPlainObject(value)) {
              var childSize = {width: 1};
              var childHTML = makeHTMLtable(value,prefix + '[' + index + '][\''+ key + '\']',childSize);
              result += '<span style="flex-grow: '+ childSize.width + ';">' + childHTML + '</span>';
            }

            // primitive values also use an input form generated recursively
            else {
              var childSize = {width: 1};
              var childHTML = makeHTMLtable(value,prefix + '[' + index + '][\''+ key + '\']',childSize);
              result += '<span style="flex-grow: '+ childSize.width + ';">' + childHTML
                 + '</span>';
            }

          });

        }

        // array or primitive mixed in with objects, give it its own row
        else
          result += makeHTMLtable(item,prefix + "[" + index + "]");

        result += '</div>'; // end the row
      });

      // done with the array of values, now know how big each column header should be
      var columnHeaders = '<div class="cbui-table-header-filled padding-left">';
      _.forIn(keys, function(value,key) {
        columnHeaders += '<span style="flex-grow: ' + columnWidths[key] + ';">' + mySanitize(key) +'</span>';
      });
      columnHeaders += '</div>';

      // finish the table
      result = columnHeaders + result;
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

      var dataRow = '<div class="cbui-tablerow padding-tight">';

      // figure out the widths of each column
      _.forIn(object, function(value,key) {
        var childSize = {width: 1};
        dataRow += '<span class="cbui-table-cell">' + makeHTMLtable(value,prefix + "['" + key + "']",childSize) + '</span>';
        if (!columnWidths[key] || childSize.width > columnWidths[key])
          columnWidths[key] = childSize.width;
      });
      dataRow += '</div>';

      // row of field names
      var totalWidth = 0;
      var columnHeaders = '<div class="cbui-table-header-filled padding-left padding-right-0">';
      _.forIn(object, function(value,key) {
        columnHeaders += '<span class="cbui-table-cell" style="flex-grow: ' +
          columnWidths[key] + ';">' + mySanitize(key) +'</span>';
        totalWidth += columnWidths[key];
      });
      columnHeaders += '</div>';

      totalSize.width = totalWidth;
      result += columnHeaders + dataRow;
    }

    //it's also possible we were passed a primitive value, in which case just put it in a div

    else {
      var model = ' ng-model="results' + prefix + '" ';
      if (_.isNumber(object))
        result += '<input type="number" ' + model + '>';
      else
        result += '<textarea ' + model + '></textarea>';
    }

    return(result);
  };

})();
