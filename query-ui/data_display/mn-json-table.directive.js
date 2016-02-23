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
 *  For usage, see the header to mn-json-table.
 */
/* global _, angular */
(function() {

	'use strict';
	angular.module('mnJsonTable', []).directive('mnJsonTable', function () {
		return {
			restrict: 'A',
			scope: { data: '=mnJsonTable' },
			template: '<div></div>',
			link: function (scope, element) {

				scope.mnJsonTableToggleExpand = mnJsonTableToggleExpand;
				//console.log("Got toggleExpoand: " + mnToggleExpand);

				scope.$watch('data', function (json) {
					if (typeof json === 'string') {
						try {
							scope.json_length = json.length;
							json = JSON.parse(json);
						} catch (e) {
						}
					}

					// start with an empty div, if we have data convert it to HTML
					var content = "<div>{}</div>";
					if (json) {
						content = '<div class="ajtd-root ajtd-type-array">' +
						  makeHTMLtable(json,"") + "</div>";
					}

					// set our element to use this HTML
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
	});



	//recursion in Angular is really inefficient, so we will use a javascript
	//routine to convert the object to an HTML representation. It's not true to
	//the spririt of Angular, but it was taking 10 seconds or more to render
	//a table with tens of thousands of cells


	var makeHTMLtable = function(object,prefix) {
		var result = '';

		// we expect an array of objects, which we turn into an HTML table. the first step is
		// to create the set of columns, by looking at the fields of every object. If the array
		// only has primitives, then we'll output a single column table listing them.
		// If the array is heterogenous, then some rows will be objects, and some rows will
		// be arrays/primitives

		if (_.isArray(object)) {
			// if the array is empty, say so
			if (object.length == 0)
				return('<div class=ajtd-key>[]</div>');

			// find the columns
			var arrayObjCount = 0;
			var arrayArrayCount = 0;
			var arrayPrimCount = 0;
			var itemsKeysToObject = {};
			_.forEach(object, function (item, index) {
				if (_.isPlainObject(item)) {
					arrayObjCount++;
					_.forEach(item, function (value, key) {
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
				result += '<table class="ajtd-root ajtd-object-value ajtd-value single-type-array"><tbody>';

				_.forEach(object, function (item,index) {
					result += '<td title="' + prefix + "[" + index  + ']">' +
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
						_.forEach(item[onlyField], function (value, key) {
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

            result += '<table class="ajtd-object-value ajtd-table multi-type-array sortable"><thead>';

			var keys = (innerKeys ? innerKeys : itemsKeysToObject);
			_.forEach(keys, function(value,key) {
              result += '<th class=ajtd-column-header>' + key +'</th>';
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
						result += '<td title="' + prefix + "[" + index  +
                        ']"><div class=ajtd-key>empty object</div></td>';

					else _.forEach(keys, function(b,key) {
						var value = item ? item[key] : null;
						result += '<td title="' + prefix + "[" + index  +
                        '].' + key + '" class="ajtd-cell">'; // start the cell


						// for objects and arrays, make a recursive call
						if (_.isArray(value) || _.isPlainObject(value))
							result += makeHTMLtable(value,prefix + '[' + index + '].'+ key + ".");

						// for long strings, output an expandable cell
						else if (_.isString(value) && value.length > 128)
							result += '<div class=ajtd-value><div class="ajtd-hideContent">' + value + '</div><a onClick="mnJsonTableToggleExpand(this)">(more...)</a></div>';

						// for everything else, just output the values
						else if (!_.isUndefined(value) || value === 0)
							result += '<div class=ajtd-value>' + value + ' </div>';

						// except undefined values, in which case output a nbsp
						else
							result += '&nbsp';

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
		// we have one special case, which occurs with "property" objects in schemas. Each
		// field of these objects has the same schema, so we really should show objects like
		// that as a single table with all the properties, instead of multiple individual tables.
		//

		else if (_.isPlainObject(object)) {
			// check for special case: every field is a sub-object with the same schema
			var specialCase = true;
			var memberKeys;
			_.forEach(object, function(value,key) { // iterate over the object's fields
				var currentKeys = _.keys(value);
				if (!_.isPlainObject(value)) {        // they all must be objects, not arrays or primitives
					specialCase = false;
					return false;
				}
				if (!memberKeys)                      // keep track of the child schema
					memberKeys = currentKeys;
				else if (!twoArraysSimilar(memberKeys,currentKeys)) {
					specialCase = false;
					return false;
				}
				// if the two arrays are similar, but the new one is longer, use the new one
				else if (currentKeys.length  > memberKeys.length)
					memberKeys = currentKeys;
			});

			// header columns for each field

			result += '<table class="ajtd-root ajtd-object-value ajtd-table plain-object sortable"><thead>';

			////////////////////////////////////////////////////////////////////////
			// if we are doing special case, add a blank column for the object name, then
			// all the names of the member keys
			if (specialCase) {
				result += '<th class=ajtd-column-header></th>';
				_.forEach(memberKeys, function(item,index) {
					result += '<th class=ajtd-column-header>' + item +'</th>';
				});

				// start the table body
				result += '</thead><tbody>';

				// for each object member, output the name of the object, then its members
				_.forEach(object, function(value,key) {
					result += '<tr><td title="' + prefix + key +
                    '" class="ajtd-cell"><div>' + key + '</div></td>';

					_.forEach(memberKeys, function(innerKey,index) {
						result += '<td title="' + prefix + key + '.' + innerKey +
                        '" class="ajtd-cell"><div>';

						if (_.isArray(value[innerKey]) || _.isPlainObject(value[innerKey]))
							result +=  makeHTMLtable(value[innerKey],prefix + key + "." + innerKey + ".") ;
						else if (!_.isUndefined(value[innerKey]))
							result += value[innerKey];

						result += '</div></td>';
					});
					result += '</tr>';
				});
			}

			// regular case, horizontal table with headers are names of keys
			else {
				_.forEach(object, function(value,key) {
					result += '<th class=ajtd-column-header>' + key +'</th>';
				});
				result += '</thead><tbody><tr>';

				// now output values for each field
				_.forEach(object, function(value,key) {
					// for arrays and objects, we need a recursive call
					if (_.isArray(value) || _.isPlainObject(value))
						result += '<td title="' + prefix + key  +
                        '" class="ajtd-cell"><div>' +
						  makeHTMLtable(value,prefix + key + ".") + '</div></td>';

					// otherwise, for primitives, output key/value pair
					else
						result += '<td title="' + prefix + key  +
                        '" class="ajtd-cell"><div>' + value + '</span></div></td>';
				});
			}
			// finish the table
			result += '</tr></tbody></table>';

		}

		//it's also possible we were passed a primitive value, in which case just put it in a div

		else
			result += '<div class=ajtd-value>' + object + '</div>'

			return(result);
	};

	//
	// convenience function used to see if two sorted arrays of key names are close enough. We expect no more than
	// one key different between them.
	//

	function twoArraysSimilar(array1,array2) {
		if (!_.isArray(array1) || !_.isArray(array2)) // sanity check - make sure we have arrays
			return(false);
		var index1 = 0;
		var	index2 = 0;
		var sameCount = 0;
		var diffCount = 0;

		// use two pointers to loop though the arrays, comparing elements
		while (index1 < array1.length && index2 < array2.length) {
			//console.log("Comparing: " + array1[index1] + " to " + array2[index2]);
			if (array1[index1] === array2[index2]) {
				sameCount++; index1++; index2++;
			}
			else if (array1[index1] < array2[index2]) {
				diffCount++; index1++;
			}
			else {
				diffCount++; index2++;
			}
		}

		// count any surplus elements in one or other arrays
		while (index1 < array1.length) {
			diffCount++; index1++;
		}
		while (index2 < array2.length) {
			diffCount++; index2++;
		}

		// if no more than two different fields, return true
		return (diffCount <= 4);
	}


})();


//toggle expansion of long strings. This is in the global scope since otherwise it won't be visible to
// the HTML generated above


var mnJsonTableToggleExpand = function(ev) {
	var textElem = ev.parentNode.children[0];
	//console.log("ToggleExpand, class: " + textElem.className + ", src: " + ev.textContent);
	if (textElem.className.indexOf("ajtd-hideContent") > -1)
	{
		ev.textContent = "(less...)";
		textElem.className = textElem.className.replace("ajtd-hideContent","ajtd-showContent");
	}
	else if (textElem.className.indexOf("ajtd-showContent") > -1)
	{
		ev.textContent = "(more...)";
		textElem.className = textElem.className.replace("ajtd-showContent","ajtd-hideContent");
	}
};
