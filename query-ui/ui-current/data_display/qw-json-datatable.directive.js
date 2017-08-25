/**
 * Angular directive to convert JSON into HTML tree. Originally inspired by Brian Park's
 * MIT Licensed "angular-json-human.js" which turns JSON to HTML tables, though at this
 * point it's diverged pretty dramatically.
 *
 *  This class takes a JS object or JSON string, and displays it as an HTML
 *  table. Generally, it expects an array of something. If it's an array of objects,
 *  then each row corresponds to one object, and the columns are the union of all
 *  fields of the objects. If an object doesn't have a field, that cell is blank.
 *
 */
/* global _, angular */
(function() {

	'use strict';
	angular.module('qwJsonDataTable', []).
	  directive('qwJsonDataTable', function () {

		return {
			restrict: 'A',
			scope: { data: '=qwJsonDataTable' },
			template: '<div class="qwDataTable"></div>',
			link: function (scope, element) {

			  scope.$watch('data', function (json) {

			    if (typeof json === 'string') {
			      try {
			        scope.json_length = json.length;
			        json = JSON.parse(json);
			      } catch (e) {
			        console.log("Error parsing json passed to table viewer.");
			      }
			    }

			    // start with an empty div, if we have data convert it to HTML
			    var header;
			    var wrapper = '<div class="data-table-wrapper">{}</div>';
			    var table;
			    var header;

			    if (json) {
			      var usingDataTable = true;

			      wrapper = '<div class="data-table-wrapper"></div>';
			      // analyze the data to see if we can make a datatable
			      //console.log("Starting analysis...");
			      //var pre_analyze_ms = new Date().getTime(); // when did we start?

			      // we must have an array, if it's not, wrap it in an array
			      if (!_.isArray(json))
			        json = [json];

			      var meta = getMetaDataAndSizes(json);

			      if (meta) {
			        usingDataTable = true;
			        //console.log("Got json meta: ");
			        //console.log(JSON.stringify(meta,null,4));

			        // make the table header with the top-level fields
			        header = angular.element(createHTMLheader(meta));

			        //var pre_create_ms = new Date().getTime(); // when did we start?

			        // add the first 2500px of table
                    var tableHTML = '<div class="data-table" style="height: ' +
                      meta.offsets[meta.offsets.length - 1] + 'px"></div>';

			        tableHTML += createHTMLForVisibleRegion(json,meta,0,2500);

			        // close the outer data-table div
			        tableHTML += '</div>';

			        //var pre_render_ms = new Date().getTime(); // when did we start?

			        // create the HTML element
			        table = angular.element(tableHTML);

			        //var post_render_ms = new Date().getTime(); // when did we start?

			       // console.log("Analyze: " + (pre_create_ms - pre_analyze_ms));
			        //console.log("Create:  " + (pre_render_ms - pre_create_ms));
			        //console.log("Render:  " + (post_render_ms - pre_render_ms));
			      }

			      //
			      // otherwise show error message
			      //

			      else {
			        wrapper = '<div class="data-table-wrapper">Unable to process data, see log.</div>';
			        console.log("Unable to create tabular view for data:");
			        console.log(JSON.stringify(json,null,4));
			      }
			    }

			    var wrapperElement = angular.element(wrapper);
			    if (table)
			      wrapperElement.append(table);

			    // set our element to use this new HTML
			    element.empty();
			    if (header) element.append(header);
			    element.append(wrapperElement);

			    //
			    // listen for scrolling, with a delay, and update the rendered portion of the screen
			    //

			    var timeoutHandle;

			    if (usingDataTable) {
			      // listen on scrolling in the data window
			      wrapperElement[0].addEventListener("scroll",function() {
			        if (header) {
			          header[0].scrollLeft = wrapperElement[0].scrollLeft;
			        }

			        clearTimeout(timeoutHandle);

			        timeoutHandle = setTimeout(function() {
			          //console.log("Scrolling to: " + el[0].scrollTop);
			          var newHTML = createHTMLForVisibleRegion(json,meta,wrapperElement[0].scrollTop,
			              wrapperElement[0].clientHeight);
			          if (newHTML.length > 0 && table)
			            wrapperElement.append(angular.element(newHTML));
			        }, 50); // 50ms delay
			      });

			      // also listen on horizontal scrolling in the header, to keep the data in sync
			      if (header) header[0].addEventListener("scroll",function() {
			        wrapperElement[0].scrollLeft = header[0].scrollLeft
			      });
			    }
			  });
			}
		};
	});


	//
	// create the html for a header based on the metadata
	//

	function createHTMLheader(meta, inner) {
	  // a header only is appropriate for arrays
      var headerHTML = '<div class="data-table' + (inner?'-inner':'') + '-header-row">';

      // for arrays of objects, have a header using the arrayInnerObjects keys
      if (meta.arrayInnerObjects) for (var fieldName in meta.arrayInnerObjects.innerKeys) {
        var size = meta.arrayInnerObjects.innerKeys[fieldName].size;
        headerHTML += '<span style="min-width: ' + size + 'ch; max-width:' +
          size + 'ch"' + 'class="data-table-header-cell">' + mySanitize(fieldName) +'</span>';
      }

      // if we have arrays that include non-objects as well, leave an untitled column for them
      if (meta.arrayInnerPrims) {
        headerHTML += '<span style="min-width: ' +
            meta.arrayInnerPrims.size + 'ch; max-width:' +
            meta.arrayInnerPrims.size + 'ch"' +
            'class="data-table-header-cell"></span>';
      }

      // for objects with inner keys, output those column
      if (meta.innerKeys) for (var fieldName in meta.innerKeys) {
        var size = meta.innerKeys[fieldName].size;
        headerHTML += '<span style="min-width: ' + size + 'ch; max-width:' +
          size + 'ch"' + 'class="data-table-header-cell">' + mySanitize(fieldName) +'</span>';
      }

      headerHTML += '</div>';
      return(headerHTML);
	}


	//
	// create html rows for a given range of visible screen
	//

	function createHTMLForVisibleRegion(data,meta,scrollTop,height) {
	  // if there is no data, output empty array symbols
	  if (data.length == 0)
        return('<div>[]</div>');

	  // look at meta to see which rows correspond to the visible area of screen,
	  // add elements outside visible to permit smoother scrolling without additional rendering
	  var totalHeight = meta.offsets[meta.offsets.length - 1];
      var startRow = Math.round(data.length*scrollTop/totalHeight); //estimate starting row

      // the initial value for startRow is an estimate - move forward or back to be
      // where we want to be
      while (startRow < data.length-1 && meta.offsets[startRow] < (scrollTop-height))
        startRow++;  // creep forward to about the right place
	  while (startRow > 0 && meta.offsets[startRow] > (scrollTop-height))
	    startRow--; // creep backward to add extra rows to the view

	  // put the endRow at the startRow, advance until it's where we want it
	  var endRow = startRow;
      while (endRow < data.length-1 && meta.offsets[endRow] < (scrollTop+(height*2)))
        endRow++;  // creep forward to add extra rows to the view

      // to make sure that the even/odd stripes work correctly, even when children are
      // added out of order, always start with an even row number, and end with an odd row number
      if (Math.trunc(startRow/2)*2 != startRow) startRow--;
      if (Math.trunc(endRow/2)*2 == endRow && endRow < data.length-1) endRow++;

      // create the HTML for the rows in question
      var html = "";
      var rowCount = 0;
      for (var row = startRow; row <= endRow; row++) if (!meta.rendered[row]) {
        rowCount++;
        var height = (meta.offsets[row+1] - meta.offsets[row]);
        var rowHTML = '<div class="data-table-row" style="top:' + meta.offsets[row] +
        'px;max-height: ' + height + 'px;min-height: ' + height + 'px">';

        if (meta.arrayInnerObjects)
          for (var fieldName in meta.arrayInnerObjects.innerKeys) { // for each possible field
            var value;
            if (meta.outerKey)
              value = data[row][meta.outerKey][fieldName];
            else
              value = data[row][fieldName];

            rowHTML += createHTMLforValue(value,meta.arrayInnerObjects.innerKeys[fieldName]);
          }

        // if we have non-fields, add them as well
        if (meta.arrayInnerPrims && !_.isPlainObject(data[row]))
          rowHTML += createHTMLforValue(data[row],meta.arrayInnerPrims);

        // if no fields at all, empty object
        if (_.isPlainObject(data[row]) && Object.keys(data[row]).length == 0)
          rowHTML += '<div class="data-table-special-value">empty object</div>';

        // close out the div
        rowHTML += '</div>';
        html += rowHTML;
        meta.rendered[row] = true;
      }

      //if (rowCount)
        //console.log("Rendered " + rowCount + " rows between " + startRow + " and " + endRow);

      return(html);
	}


    //
    // given a value and info about the field, create HTML for it
    //

    function createHTMLforValue(item,fieldData) {
      var html = '<span style="max-width:' + fieldData.size + 'ch;min-width:' + fieldData.size +
        'ch;" class="data-table-cell">';
      //
      // for numbers and bool, use toString()
      if (_.isNumber(item)|| _.isBoolean(item))
        html += item.toString();
      // for strings just use the value
      else if (_.isString(item))
         html += mySanitize(item);

      // for arrays, if they have inner objects, just show a single header bar listing columns
      //give one line per item
      else if (_.isArray(item)) {
        html += '<div class="data-table-array">'; // wrap arrays with a 1px border

        if (item.length) { // does the array have any items?

          //console.log("Creating HTML for array length: " + item.length + ", fieldData: ");
          //console.log(JSON.stringify(fieldData,null,4));
          // does the array contain subobjects? if so, create a header
          if (fieldData.arrayInnerObjects) {
            html += createHTMLheader(fieldData, true);
            for (var i=0; i< item.length; i++) {
              html += '<div>'; // one div for each row
              // for each inner key...
              for (var innerKey in fieldData.arrayInnerObjects.innerKeys) {
                html += createHTMLforValue(item[i][innerKey],fieldData.arrayInnerObjects.innerKeys[innerKey]);
              }

              // if we have non-objects in the array as well, output them here
              if (!_.isPlainObject(item[i]) && fieldData.arrayInnerPrims)
                html += createHTMLforValue(item[i],fieldData.arrayInnerPrims);

              // finish the row
              html += '</div>';
            }
          }

          // if no subobjects, just output the values from the array
          else for (var i=0; i< item.length; i++)
            html += '<div>' + createHTMLforValue(item[i],fieldData.arrayInnerPrims) + '</div>';
        }
        // if array is empty, mark it as such
        else
          html += '<div>[]</div>';

        html += '</div>';
      }

      // for objects, output a table header in one row, plus a row of each value
      else if (_.isPlainObject(item)){

        // header
        html += createHTMLheader(fieldData,true);

        html += '<div>';
        //console.log("Got object item: " + JSON.stringify(item));
        //console.log("Inner keys: " + JSON.stringify(fieldData.innerKeys));
        for (var key in fieldData.innerKeys) {
          //console.log(" for key: " + key + ", got HTML: " + getValueHTML(item[key],fieldData.innerKeys[key]));
          html += createHTMLforValue(item[key],fieldData.innerKeys[key]);
        }

        html += '</div>';
      }

      // anything else, just output a non-blocking space
      else
        html += '&nbsp;';

      html += '</span>';
      return(html);
    }


    //
	// avoid HTML injection by changing tag markers to HTML
    //

    var lt = /</gi;
    var gt = />/gi;
    var mySanitize = function(str) {
      return(str.replace(lt,'&lt;').replace(gt,'&gt;'));
    };

    //
    // to create a DataTable, we need an array of something. If not, return.
    //
    // If the data is an array and find out what's in it. If objects,
    // go over the data to determine the union of all fields. Each field will get
    // its own column, with a fixed width.
    //
    // In addition, each row will have a fixed height, and thus
    // a fixed vertical location. Computing these ahead of time will permit us to only
    // render only visible sections of tables, and to not use HTML tables
    //
    // The purpose of this function is to look at the data, see what's there, and
    // figure out how to display it. It returns null if we can't figure out how to
    // display it (fall back to old methods), or a structure containing metadata,
    // including the fixed width for every field and subfield, and the heights
    // of each row.
    //

    function getMetaDataAndSizes(data) {

      if (!_.isArray(data)) // error checking
        return(meta);

      var fieldInfo = getFieldInfo(data,null);

      // since we checked above that 'data' is an array, the fieldInfo will contain
      // all the field details inside meta.arrayInnerKeys.
      var meta = fieldInfo;
      meta.offsets = [];       // offsets for each row
      meta.rendered = [];      // have we rendered each row?

      //console.log("Got meta: " + JSON.stringify(meta,null,4));

      // now that we have summary data for each field, compute actual sizes
      finalizeFieldWidths(meta);
      //console.log("Got meta2: " + JSON.stringify(meta,null,4));

      // when the user does "select * from default" the result is an array of objects
      // of the form: { "default" : { "some field": "some value", ...}}. We can detect
      // this case: if we have only one field, and it's a subobject, use the inner object as
      // our list of fields

      if (meta.arrayInnerObjects) {
        var fieldNames = Object.keys(meta.arrayInnerObjects.innerKeys);
        if (fieldNames.length == 1 && meta.arrayInnerObjects.innerKeys[fieldNames[0]].types.obj) {
          meta.outerKey = fieldNames[0];
          meta.arrayInnerObjects.innerKeys = meta.arrayInnerObjects.innerKeys[fieldNames[0]].innerKeys;
        }
      }

      // now we know the width of every column, compute the height/offset of
      // every row so we know where to render each row

      meta.offsets[0] = 0; // first row starts at zero px from the top

      for (var index = 0; index < data.length; index++) { // for each data item
        var item = data[index];
        var lineHeight = 1;

        if (meta.arrayInnerObjects) for (var fieldName in meta.arrayInnerObjects.innerKeys) { // for each possible field
          var value;
          if (meta.outerKey)
            value = item[meta.outerKey][fieldName];
          else
            value = item[fieldName];

          var fieldHeight = getItemHeight(value,meta.arrayInnerObjects.innerKeys[fieldName]);
          //console.log("Field: " + fieldName + " height: " + fieldHeight);
          if (fieldHeight > lineHeight)
            lineHeight = fieldHeight;
        }

        // handle any non-objects
        if (meta.arrayInnerPrims && !_.isPlainObject(item)) {
          var fieldHeight = getItemHeight(item,meta.arrayInnerPrims);
          if (fieldHeight > lineHeight)
            lineHeight = fieldHeight;
        }

        // the height value we get above is in "lines" of text, we need to convert that to pixels.
        meta.offsets[index + 1] =
          meta.offsets[index] + (lineHeight * lineHeightPixels) + lineSpacingPixels; // each line 21px

        //console.log("row: " + index + " has lineHeight: " + lineHeight + " size: " +
        // ((lineHeight * lineHeightPixels) + lineSpacingPixels));
      }

      // we now have a width for every column of every field.
      return(meta);
    }


    /////////////////////////////////////////////////////////////////////////////
    // given an data item, figure out how much size it needs in the table.
    // estimate size in terms of characters.
    //
    // we call this for instance of the field in each document/row, so it keeps
    // a running tally of the max size seen, the types seen, and the average size
    //
    var maxFieldWidth = 80; // wrap if a field is longer than this many chars
    var characterPadding = 2; // make fields this many characters bigger for padding
    var lineHeightPixels = 22;
    var lineSpacingPixels = 5;

    function getFieldInfo(item,fieldData) {
      if (!fieldData)
        fieldData = {
          types: {},    // what types have been seen for this field: num, str, bool, arr, obj
          maxSize: 0,   // maximum size of any piece of data
          maxObjectSize: 0, // keep track of objects independently
          innerKeys: {},// for object values, a fieldInfo struct for each sub-field
          arrayInnerObjects: null, // for array values, fieldInfo for subobjects
          arrayInnerPrims: null    // for array values, fieldInfo for primitives
          };

      var size = 0;

      // for numbers, convert to string
      if (_.isNumber(item)) {
        fieldData.types.num = true;
        size = item.toString().length + characterPadding;
      }

      // for strings, use the length
      else if (_.isString(item)) {
        fieldData.types.str = true;
        size = item.length + characterPadding;
      }

      // boolean values get 5 characters ("false")
      else if (_.isBoolean(item)) {
        fieldData.types.bool = true;
        size = 5 + characterPadding;
      }

      // arrays will be displayed vertically, so compute the maximum length of any element
      // in the array
      else if (_.isArray(item)) {
        fieldData.types.arr = true;
        for (var i=0; i < item.length; i++)
          if (_.isPlainObject(item[i]))
            fieldData.arrayInnerObjects = getFieldInfo(item[i],fieldData.arrayInnerObjects);
          else
            fieldData.arrayInnerPrims = getFieldInfo(item[i],fieldData.arrayInnerPrims);

        // we show objects and primitives side-by-side, so allow space for both
        if (fieldData.arrayInnerObjects)
          size = fieldData.arrayInnerObjects.maxSize;
        if (fieldData.arrayInnerPrims)
          size += fieldData.arrayInnerPrims.maxSize;
      }

      // for objects, we need to recursively compute the size of each subfield
      else if (_.isPlainObject(item)) {
        fieldData.types.obj = true;
        for (var key in item) {
          fieldData.innerKeys[key] = getFieldInfo(item[key],fieldData.innerKeys[key]);
          size += fieldData.innerKeys[key].maxSize;
        }
        if (size > fieldData.maxObjectSize)
          fieldData.maxObjectSize = size;
      }

      // remember a field's max size
      if (size > fieldData.maxSize)
        fieldData.maxSize = size;

      return(fieldData);
    }


    //
    // Once we have looked at each instance of each field, we know the average and
    // max sizes, as well as all possible types. In this function we recursively
    // figure out the appropriate size for each field.
    //
    // Each subobject is the width of its children plus margins. Traverse
    // the list of fields, and for primitive types add their width, for object
    // types recursively compute their subobject width
    //
    // we are passed in a fieldInfo, which has types, maxSize, and possible innerKeys
    // and arrayInnerKeys. We start by computing the width of any children, and bose
    // our width on that.
    //
    //

    function finalizeFieldWidths(fieldInfo) {

      // fields can have multiple types, figure out an appropriate size
      // even in that case.

      // how much space should we give to a field?
      // - for an array, or string, use the max size, unless it's too long
      // - for a subobject, it was computed in recursive call above

      // - for a number or boolean, use the max size
      if (fieldInfo.types.num || fieldInfo.types.bool)
        fieldInfo.size = fieldInfo.maxSize + characterPadding;

      // a string might take up more space, up to maxFieldWidth
      if (fieldInfo.types.str)
        fieldInfo.size = Math.ceil(Math.min(maxFieldWidth,fieldInfo.maxSize));

      // an array can be arbitrarily large
      if (fieldInfo.types.arr) {
        var arraySize = 0;
        if (fieldInfo.arrayInnerObjects)
          arraySize = finalizeFieldWidths(fieldInfo.arrayInnerObjects) + 0.5;
        if (fieldInfo.arrayInnerPrims)
          arraySize += finalizeFieldWidths(fieldInfo.arrayInnerPrims) + 0.5;

        if (!fieldInfo.size || arraySize > fieldInfo.size) // see if array is bigger than any other types
          fieldInfo.size = arraySize;
      }

      // for objects, sum up the size of each child
      if (fieldInfo.types.obj) {
        var size = 0;
        for (var fieldName in fieldInfo.innerKeys) {
          var dataSize = finalizeFieldWidths(fieldInfo.innerKeys[fieldName]);
          var nameSize = fieldName.length + characterPadding;
          if (nameSize > dataSize) // make fields no smaller than their names
            fieldInfo.innerKeys[fieldName].size = nameSize;

          // if the field size is smaller than the field name, use the field name size
          size += Math.max(dataSize,nameSize);
        }

        if (!fieldInfo.size || size > fieldInfo.size)
          fieldInfo.size = size + 0.5; // add padding
      }

      // null values don't match the above
      if (!fieldInfo.size) {
        fieldInfo.size = 0; // null value?
      }

      return(fieldInfo.size);
    }


    //
    // once we have computed the fixed widths for each field, for any particular row we
    // use the width to figure out how many vertical lines it will need.
    // This is a recursive task, since there must be a height for nested items
    //

    function getItemHeight(item,fieldData) {
      //console.log("Item: " + item + ", fieldData: " + JSON.stringify(fieldData));
      // check the field type, some can wrap, others not
      // numbers and bool only get one line, since they don't wrap
      if (_.isNumber(item) || _.isBoolean(item))
        return 1;

      // for strings, see how many lines they wrap based on the allowed width
      else if (_.isString(item)) {
        if (!fieldData) {
          var err = new Error();
          console.log(err.stack);
          return(1);
        }

        // because the 'ch' measure in html doesn't correspond with the number of characters
        // in big blocks of regular English text, if we have 6 or more lines then reduce the
        // line count by 20%

        var lines = Math.ceil(item.length/fieldData.size);
        if (lines > 5)
          lines = Math.ceil((item.length*0.85)/fieldData.size);

        //console.log("String " + item.substring(0,10) + " lines: " + lines);
        return(lines);
      }

      // for arrays, recursively compute the number of lines needed for each element
      else if (_.isArray(item)) {
        var lineCount = 0;
        // if the array has arrayInnerKeys, we don't have a header line for each individual
        // item, just one for the whole array
        if (fieldData.arrayInnerObjects) {
          lineCount = 1; // space for header
          for (var i=0; i< item.length; i++) {
            if (_.isPlainObject(item[i])) {
              lineCount += (getItemHeight(item[i],fieldData.arrayInnerObjects)-1);
            }
            else
              lineCount += getItemHeight(item[i],fieldData.arrayInnerPrims);
          }
        }
        else if (fieldData.arrayInnerPrims) {
          for (var i=0; i< item.length; i++)
            lineCount += getItemHeight(item[i],fieldData.arrayInnerPrims);
        }
        // add a bit for margins
        lineCount += 0.125;
        //console.log("Array with " + item.length + " items got lines: " + lineCount);
        return(lineCount);
      }

      // for objects, find the max line count across all fields, and add one for the header.
      else if (_.isPlainObject(item)) {
        var maxHeight = 1;
        for (var key in fieldData.innerKeys) {
          var childHeight = getItemHeight(item[key],fieldData.innerKeys[key]);
          if (childHeight > maxHeight)
            maxHeight = childHeight;
        }
        return(maxHeight + 1);
      }

      // anything else is probably null, height 1
      else
        return(1);
    }

})();

