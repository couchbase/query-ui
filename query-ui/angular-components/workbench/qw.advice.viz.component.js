/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import _                               from 'lodash';
import { MnLifeCycleHooksToStream }    from 'mn.core';
import { Component, ViewEncapsulation} from '@angular/core';

import { QwQueryService }              from '../../angular-services/qw.query.service.js';

import template                        from './qw.advice.viz.html';

export { QwAdviceVizComponent };


class QwAdviceVizComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        selector: "qw-advice-viz",
        template,
        styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
        inputs: [
          "subject"
        ],
        encapsulation: ViewEncapsulation.None,
      })
    ]
  }

  static get parameters() {
    return [
      QwQueryService,
    ];
  }


  constructor(qwQueryService) {
    super();
    this.qwQueryService = qwQueryService;
  }

  ngOnInit() {
    if (this.subject)
      this.subscription = this.subject.subscribe(val => this.handleNewData(val));

  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.subscription && this.subscription.unsubscribe();
  }

  handleNewData(query_result) {
    let advice = (!query_result ? null : query_result.advice);
    this.error = null;
    this.advice = null;
    // handle possible error conditions
    if (!advice || _.isString(advice)) {
      if (multipleQueries(this.qwQueryService.getCurrentResult()))
        this.error = 'Advise does not support multiple queries.';

      // the query might or might not have advice already
      else if (!advice || advice === this.qwQueryService.getCurrentResult().query) {
        this.error = "Click 'Index Advisor' to generate query index advice.";
        this.advice = null;
      }

      else if (!queryIsAdvisable(query_result))
        this.error = 'Advise supports SELECT, MERGE, UPDATE and DELETE statements only.';

      else if (_.isString(advice))
        this.error = advice;

      else
        this.error = "Unknown error getting advice.";
    }

    // we have some kind of advice, let's display it
    else {
      this.error = null;
      this.advice = _.isArray(advice) ? advice : [advice];
    }

  }

  // do we have covered indexes to recommend for a given advice element?
  has_covered(element) {
    return(element && element.recommended_indexes && element.recommended_indexes.covering_indexes &&
      element.recommended_indexes.covering_indexes.length > 0);
  }

  get_covered_indexes(element) {
    var covered = [];
    if (element.recommended_indexes && _.isArray(element.recommended_indexes.covering_indexes))
      element.recommended_indexes.covering_indexes.forEach(function (item) {covered.push(item.index_statement);});
    return(covered);
  }

  // get the regular indexes that are not part of the covering indexes
  get_regular_indexes(element) {
    var indexes = [];
    var covered = this.get_covered_indexes(element);
    if (element.recommended_indexes && _.isArray(element.recommended_indexes.indexes))
      element.recommended_indexes.indexes.forEach(function (item) {
        if (!covered.some(function (c_stmt) {
          return(c_stmt == item.index_statement);
        }))
          indexes.push(item.index_statement);
      });
    return(indexes);
  }

  // are the existing indexes sufficient?
  existing_indexes_sufficient(element) {
    return this.get_regular_indexes(element).length == 0 &&
      this.get_covered_indexes(element).length == 0 &&
      element.current_indexes && element.current_indexes.length > 0;
  }

  no_indexes_possible(element) {
    return(element && _.isString(element.recommended_indexes));
  }

  // create the recommended indexes
  create_option(type,index) {
    var This = this; // for callbacks
    var queries = [];
    if (this.advice[index].recommended_indexes && _.isArray(this.advice[index].recommended_indexes[type])) {
      this.advice[index].recommended_indexes[type].forEach(function(reco) {
        queries.push(reco.index_statement);
      });

      var executeInSequence = function(index,queries) {
        if (index >= queries.length)
          return;
        This.qwQueryService.executeQueryUtil(queries[index],false)
          .then(
            function success(resp)
            {executeInSequence(index+1,queries);},
            function error(resp)
            {
              var message = "Error creating index.";
              var message_details = [];
              if (resp && resp.config && resp.config.data && resp.config.data.statement)
                message_details.push(resp.config.data.statement);
              if (resp && resp.data && resp.data.errors)
                resp.data.errors.forEach(error => message_details.push(error.msg));

              This.qwQueryService.showErrorDialog(message,message_details);
            });
      };

      executeInSequence(0,queries);

      // bring up a dialog to warn that building indexes may take time.
      this.qwQueryService.showWarningDialog("Creating indexes, it may take time before they are fully built. Update the advice to see if the index is built.");
    }

    else
      this.qwQueryService.showWarningDialog("Internal error parsing index definitions to create.");
  }

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
