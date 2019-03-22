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
  angular.module('qwQuery').directive('qwAdviceViz', ['qwQueryService',getAdviceViz]);

  function getAdviceViz(qwQueryService) {
    return {
      restrict: 'A',
      scope: { data: '=qwAdviceViz' },
      templateUrl: '../_p/ui/query/ui-current/advice_viz/qw-advice-viz.html',
      //template: '<div></div>',
      link: function (scope, element) {

        scope.$watch('data', function (advice) {

          //console.log("Got advice data: " + JSON.stringify(advice));

          // create the recommended indexes
          scope.create_option = function(index) {
            if (_.isArray(advice[index].recommended_indexes))
              advice[index].recommended_indexes.forEach(function(reco) {
                qwQueryService.executeQueryUtil(reco.index_statement,false);
              });

            // bring up a dialog to warn that building indexes may take time.
            qwQueryService.showWarningDialog("Creating indexes, it may take time before they are fully built. Update the advice to see if the index is built.");
          };
          scope.update_advice = function() {qwQueryService.runAdviseOnLatest();};

          // make sure that advise is possible
          if (!queryIsAdvisable(qwQueryService.getCurrentResult()))
            scope.error = 'Advise supports SELECT, MERGE, UPDATE and DELETE statements only.';

          else if (multipleQueries(qwQueryService.getCurrentResult()))
            scope.error = 'Advise does not support multiple queries.';

          // the query might or might not have advice already
          else if (!advice || _.isString(advice))
              scope.error = 'No current advice, execute query or click update to get advice.';

          // is there actually advice to create an index? See if we have some array of recommendations
          //else if (_.isArray(advice) &&
          //    !advice.some(function (element) {return(_.isArray(element.recommended_indexes));})) {
          //  scope.error = 'No index recommendation at this time.';
          //}

          else {
            scope.error = null;
            scope.advice = advice;
          }

          // set our element to use this HTML
          //element.html(content);
        });
      }
    };
  }

  function queryIsAdvisable(queryResult) {return /^\s*select|merge|update|delete/gmi.test(queryResult.query);}

  function multipleQueries(queryResult) {
    var findSemicolons = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/\*(?:.|[\n\r])*\*\/)|(`(?:[^`]|``)*`)|((?:[^;"'`\/]|\/(?!\*))+)|(;)/g;
    var matchArray = findSemicolons.exec(queryResult.query);
    var queryCount = 0;

    while (matchArray != null) {
      if (matchArray[0] == ';')
        if (queryCount++ > 1)
          return true;
      matchArray = findSemicolons.exec(queryResult.query);
    }
    return false;
  }
})();
