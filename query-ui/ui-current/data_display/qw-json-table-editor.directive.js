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
      restrict: 'A',
      scope: { data: '=qwJsonTableEditor' },
      template: '<div></div>',
      link: function (scope, element) {

        scope.$watch('data', function (json) {
//          if (typeof json === 'string') {
//            try {
//              scope.json_length = json.length;
//              json = JSON.parse(json);
//            } catch (e) {
//            }
//          }

          // start with an empty div, if we have data convert it to HTML
          var content = "<div>{}</div>";
          if (json) {
            scope.results = json;
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

  //
  // top-level: we have an array of objects, each with a 'data' and 'id' field
  //

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
        return('<div class="ajtd-key">No Results</div>');

      var topLevelKeys = {};
      for (var row=0; row < object.length; row++)
        if (object[row].data && object[row].id) {// they'd all better have these
          //console.log("row: " + row + ": " + JSON.stringify(object[row].data));
          _.forEach(object[row].data, function (value, key) {
            topLevelKeys[key] = true;
          });
        }

      // Make a table whose columns are the union of all fields in all the objects,
      // plus the id field.

      result += '<table class="ajtd-root ajtd-object-value ajtd-table multi-type-array sortable"><thead>';

      // id field
      result += '<th></th><th>id</th>';

      _.forIn(topLevelKeys, function(value,key) {
        result += '<th>' + key +'</th>';
      });

      result += '</thead><tbody>';
      //console.log("After header, result: " + result);

      // for each object in the array, output all the possible column values
      for (var row=0; row < object.length; row++) if (object[row].data && object[row].id)  {// they'd all better have these

        result += '<tr>'; // new row for each object

        // button to update record in the first column
        result += '<td><button ng-click="dec.updateDoc(' + row + ')" style="margin-bottom: 0.5rem">' +
          '<div ng-if="!dec.options.queryBusy">Update</div>' +
          '<div ng-if="dec.options.queryBusy" class="icon-button">' +
          'Updating</div> </button></td>';

        // put the meta().id in the next column
        result += '<td>' + object[row].id + '</td>';

        _.forIn(topLevelKeys, function (value, key) {
          var item = object[row].data[key];
          result += '<td>';
          result += makeHTMLtable(item,'[' + row + '].data.'+ key);
          result += '</td>'; // end the cell
        });

        result += '</tr>'; // end of the row for the top level object
      }

      //console.log("After header, loop: " + result);

      // done with array, close the table
      result += '</tbody></table>';
    }

    else if (_.isString(object)) // error messages show up as strings
      result = '<div class="ajtd-key">' + object + '</div>';

    return(result);
  }


  //recursion in Angular is really inefficient, so we will use a javascript
  //routine to convert the object to an HTML representation. It's not true to
  //the spririt of Angular, but it was taking 10 seconds or more to render
  //a table with tens of thousands of cells

  function makeHTMLtable(object,prefix) {
    var result = '';

    // we expect an array of objects, which we turn into an HTML table. the first step is
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
      // special case: an array of primitive types or arrays. output them as a single-row table
      //

      if (arrayObjCount == 0)  {
        result += '<table class="ajtd-root"><tbody>';

        _.forEach(object, function (item,index) {
          result += '<td>' +
          makeHTMLtable(item, prefix + '[' + index + ']') + '</td>'
        });
        result += '</tbody></table>';

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

      result += '<table class="ajtd-root ajtd-object-value ajtd-table multi-type-array sortable"><thead>';

      var keys = (innerKeys ? innerKeys : itemsKeysToObject);
      _.forIn(keys, function(value,key) {
        result += '<th>' + key +'</th>';
      });

      result += '</thead><tbody>';

      // for each object in the array, output all the possible column values
      _.forEach(object, function (item, index) {
        result += '<tr>'; // new row for each object
        if (_.isPlainObject(item)) {
          // if we are using innerKeys, get to the inner object
          if (innerKeys)
            item = item[onlyField];

          // if it's an empty object, just say so
          if (_.keys(item).length == 0)
            result += '<td><div class="ajtd-key">empty object</div></td>';

          else _.forIn(keys, function(b,key) {
            var value = item ? item[key] : null;
            result += '<td class="ajtd-cell">'; // start the cell


            // for objects and arrays, make a recursive call
            if (_.isArray(value) || _.isPlainObject(value))
              result += makeHTMLtable(value,prefix + '[' + index + '].'+ key + ".");

            // for long strings, output an expandable cell
//          else if (_.isString(value) && value.length > 128)
//          result += '<div class=ajtd-value><div class="ajtd-hideContent">' + value + '</div><a href="javascript:void();" onclick="qwJsonTableToggleExpand(this)">more...</a></div>';

            // for everything else, just output the values
            else if (!_.isUndefined(value) || value === 0)
              result += '<div class=ajtd-value>' + value + ' </div>';

            // except undefined values, in which case output a nbsp
            else
              result += '&nbsp;';

            result += '</td>'; // end the cell
          });

        }

        // array or primitive mixed in with objects, give it its own row
        else if (_.isArray(item))
          result += makeHTMLtable(item,prefix + "[" + index + "].");
        else
          result += item;

        result += '</tr>';
      });

      // done with array, close the table
      result += '</tbody></table>';
    }

    //
    // instead of an array, we might get an object, create a table and iterate over the fields
    // what is the right way to do this? An object could be shown as a horizontal table, with
    // one column per field. It also could be shown as a vertical table, with one row per field.
    // We will choose horizontal, in most cases, since the header can nicely show field names
    // as different.
    //

    else if (_.isPlainObject(object)) {

      // header columns for each field

      result += '<table class="ajtd-root ajtd-object-value ajtd-table plain-object sortable"><thead>';

      // horizontal table with headers are names of keys
        _.forIn(object, function(value,key) {
          result += '<th>' + key +'</th>';
        });
        result += '</thead><tbody><tr>';

        // now output values for each field
        _.forIn(object, function(value,key) {
          // for arrays and objects, we need a recursive call
          result += '<td class="ajtd-cell"><div>' +
            makeHTMLtable(value,prefix + "." + key) + '</div></td>';
        });
      // finish the table
      result += '</tr></tbody></table>';

    }

    //it's also possible we were passed a primitive value, in which case just put it in a div

    else {
      //console.log("Got prefix: " + prefix + ", value: " + object);
      result += '<textarea class="ajtd-editor" ng-model="results' + prefix + '"></textarea>';
    }

    return(result);
  };

})();
