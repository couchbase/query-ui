/**
 * Angular directive to convert JSON into HTML tree. Inspired by Brian Park's
 * MIT Licensed "angular-json-human.js" which turns JSON to HTML tables.
 *
 *  Extended for trees by Eben Haber at Couchbase.
 *
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
          scope.advice = null;

          // do we have covered indexes to recommend for a given advice element?
          scope.has_covered = function(element) {
              return(element && element.recommended_indexes && element.recommended_indexes.covering_indexes &&
                  element.recommended_indexes.covering_indexes.length > 0);
          };

          scope.get_covered_indexes = function(element) {
            var covered = [];
            if (element.recommended_indexes && _.isArray(element.recommended_indexes.covering_indexes))
              element.recommended_indexes.covering_indexes.forEach(function (item) {covered.push(item.index_statement);});
            return(covered);
          };

          // get the regular indexes that are not part of the covering indexes
          scope.get_regular_indexes = function(element) {
            var indexes = [];
            var covered = scope.get_covered_indexes(element);
            if (element.recommended_indexes && _.isArray(element.recommended_indexes.indexes))
              element.recommended_indexes.indexes.forEach(function (item) {
                if (!covered.some(function (c_stmt) {
                  return(c_stmt == item.index_statement);
                }))
                  indexes.push(item.index_statement);
                });
            return(indexes);
           };

          // create the recommended indexes
          scope.create_option = function(type,index) {
            if (advice[index].recommended_indexes && _.isArray(advice[index].recommended_indexes[type])) {
              advice[index].recommended_indexes[type].forEach(function(reco) {
                qwQueryService.executeQueryUtil(reco.index_statement,false);
              });

              // bring up a dialog to warn that building indexes may take time.
              qwQueryService.showWarningDialog("Creating indexes, it may take time before they are fully built. Update the advice to see if the index is built.");
            }

            else
              qwQueryService.showWarningDialog("Internal error parsing index definitions to create.");
          };
          //scope.update_advice = function() {qwQueryService.runAdviseOnLatest();};

          // make sure that advise is possible
          if (!queryIsAdvisable(qwQueryService.getCurrentResult()))
            scope.error = 'Advise supports SELECT, MERGE, UPDATE and DELETE statements only.';

          else if (multipleQueries(qwQueryService.getCurrentResult()))
            scope.error = 'Advise does not support multiple queries.';

          // the query might or might not have advice already
          else if (!advice || advice === qwQueryService.getCurrentResult().query) {
              scope.error = "Click 'Advise' to generate query index advice.";
              scope.advice = null;
          }

          else if (_.isString(advice))
              scope.error = advice;

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
      // if we see anything but a comment past a semicolon, it's a multi-query
      if ((matchArray[1] || matchArray[2] || matchArray[4] || matchArray[5] || matchArray[6]) && queryCount > 0)
        return(true);

      if (matchArray[0] == ';')
        queryCount++;

      matchArray = findSemicolons.exec(queryResult.query);
    }
    return false;
  }
})();
