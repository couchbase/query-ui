/*
Copyright 2020-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {NgbModal}               from '@ng-bootstrap/ng-bootstrap';

import {QwCollectionsService}   from "./qw.collections.service.js";
import {QwConstantsService}     from "./qw.constants.service.js";
import {QwFixLongNumberService} from "./qw.fix.long.number.service.js";
import {QwQueryPlanService}     from "./qw.query.plan.service.js";
import {QwHttp}                 from './qw.http.js';
import {QwMetadataService}      from "./qw.metadata.service.js";
import {QwQueryService}         from "./qw.query.service.js";

import {QwDialogService}        from '../angular-directives/qw.dialog.service.js';

import _                        from 'lodash';
export {QwQueryWorkbenchService};

class QwQueryWorkbenchService {
  static get annotations() {
    return [
      new Injectable()
    ]
  }

  static get parameters() {
    return [
      QwHttp,
      NgbModal,
      QwCollectionsService,
      QwConstantsService,
      QwDialogService,
      QwFixLongNumberService,
      QwMetadataService,
      QwQueryPlanService,
      QwQueryService,
    ]
  }

  constructor(
    qwHttp,
    ngbModal,
    qwCollectionsService,
    qwConstantsService,
    qwDialogService,
    qwFixLongNumberService,
    qwMetadataService,
    qwQueryPlanService,
    qwQueryServiceBase,
    ) {

    // to reuse the code from AngularJS, we create the service object as before, then assign
    // all the members to this object.
    // TODO: bring all those functions and code into this object definition.
    let queryServiceCore = getQwQueryService(
        ngbModal,
        qwCollectionsService,
        qwConstantsService,
        qwDialogService,
        qwFixLongNumberService,
        qwHttp,
        qwMetadataService,
        qwQueryPlanService,
        qwQueryServiceBase,
    );

    Object.assign(this, queryServiceCore);

    this.metaReady = this.updateBuckets();
  }
}

function getQwQueryService(
  ngbModal,
  qwCollectionsService,
  qwConstantsService,
  qwDialogService,
  qwFixLongNumberService,
  qwHttp,
  qwMetadataService,
  qwQueryPlanService,
  qwQueryServiceBase,
) {

  var qwQueryService = {};
  qwQueryService.queryPlanService = qwQueryPlanService;

  qwQueryService.updateBuckets = () => {
    return qwMetadataService.updateBuckets().then(
        () => {updateBucketsCallback();},
        () => {console.log("Error getting buckets in qwQueryService")}
    )
  };

  //
  // remember which tab is selected for output style: JSON, table, or tree
  //

  qwQueryService.outputTab = 1;     // remember selected output tab
  qwQueryService.selectTab = function (newTab) {
    // some tabs are not available in some modes
    switch (newTab) {
      case 6: // advice is only available in EE
        if (!qwMetadataService.isEnterprise())
          newTab = 1;
        break;
    }

    qwQueryService.outputTab = newTab;
  };
  qwQueryService.isSelected = function (checkTab) {
    return qwQueryService.outputTab === checkTab;
  };

  var monitoringOptions = {
    selectedTab: 1,
    autoUpdate: true,
    active_sort_by: 'elapsedTime',
    active_sort_reverse: true,
    completed_sort_by: 'elapsedTime',
    completed_sort_reverse: true,
    prepared_sort_by: 'elapsedTime',
    prepared_sort_reverse: true
  };
  qwQueryService.selectMonitoringTab = function (newTab) {
    monitoringOptions.selectedTab = newTab;
    saveStateToStorage();
  };
  qwQueryService.getMonitoringSelectedTab = function () {
    return monitoringOptions.selectedTab;
  };
  qwQueryService.isMonitoringSelected = function (checkTab) {
    return monitoringOptions.selectedTab === checkTab;
  };
  qwQueryService.getMonitoringAutoUpdate = function () {
    return monitoringOptions.autoUpdate;
  };
  qwQueryService.setMonitoringAutoUpdate = function (newValue) {
    monitoringOptions.autoUpdate = newValue;
    saveStateToStorage();
  };
  qwQueryService.getMonitoringOptions = function () {
    return monitoringOptions;
  };

  // access to our most recent query result, and functions to traverse the history
  // of different results

  qwQueryService.getCurrentResult = getCurrentResult;
  qwQueryService.getCurrentIndexNumber = getCurrentIndexNumber;
  qwQueryService.getCurrentIndex = getCurrentIndex;
  qwQueryService.setCurrentIndex = setCurrentIndex;
  qwQueryService.clearHistory = clearHistory;
  qwQueryService.clearCurrentQuery = clearCurrentQuery;
  qwQueryService.hasPrevResult = hasPrevResult;
  qwQueryService.hasNextResult = hasNextResult;
  qwQueryService.prevResult = prevResult;
  qwQueryService.nextResult = nextResult;
  qwQueryService.addNewQueryAtEndOfHistory = addNewQueryAtEndOfHistory;
  qwQueryService.addSavedQueryAtEndOfHistory = addSavedQueryAtEndOfHistory;

  qwQueryService.query_context_bucket_changed = query_context_bucket_changed;

  qwQueryService.canCreateBlankQuery = canCreateBlankQuery;

  qwQueryService.getPastQueries = function () {
    return (pastQueries);
  }
  qwQueryService.getQueryHistoryLength = function () {
    return (pastQueries.length);
  }

  qwQueryService.emptyResult = emptyResult;

  //
  // keep track of the bucket and field names we have seen, for use in autocompletion
  //

  qwQueryService.autoCompleteTokens = {}; // keep a map, name and kind
  qwQueryService.autoCompleteArray = [];  // array for use with Ace Editor

  // execute queries, and keep track of when we are busy doing so

  //qwQueryService.executingQuery = {busy: false};
  qwQueryService.currentQueryRequest = null;
  qwQueryService.currentQueryRequestID = null;
  qwQueryService.executeUserQuery = executeUserQuery;
  qwQueryService.cancelQuery = cancelQuery;
  qwQueryService.cancelQueryById = cancelQueryById;

  qwQueryService.executeQueryUtil = executeQueryUtil;

  qwQueryService.saveStateToStorage = saveStateToStorage;
  qwQueryService.loadStateFromStorage = loadStateFromStorage;
  qwQueryService.getQueryHistory = getQueryHistory;

  qwQueryService.updateExpandedState = updateExpandedState; // keep track of expanded buckets/scopes/collections

  // update store the metadata about buckets

  qwQueryService.buckets = [];
  qwQueryService.bucket_names = [];
  qwQueryService.indexes = [];
  qwQueryService.udfs = [];
  qwQueryService.udfLibs = [];
  qwQueryService.updateBucketCounts = updateBucketCounts;   // get list of buckets
  qwQueryService.getSchemaForBucket = getSchemaForBucket;   // get schema
  qwQueryService.updateBucketMetadata = updateBucketMetadata;
  qwQueryService.updateCountsForBucket = updateCountsForBucket;
  qwQueryService.updateUDFs = updateUDFs;
  qwQueryService.updateUDFlibs = updateUDFlibs;
  qwQueryService.newUDFlib = newUDFlib;
  qwQueryService.dropUDFlib = dropUDFlib;

  qwQueryService.runAdvise = runAdvise;
  qwQueryService.runAdviseOnLatest = runAdviseOnLatest;
  qwQueryService.showErrorDialog = showErrorDialog;
  qwQueryService.showWarningDialog = showWarningDialog;
  qwQueryService.hasRecommendedIndex = hasRecommendedIndex;

  qwQueryService.workbenchUserInterest = 'editor';

  //
  // keep track of active queries, complete requests, and prepared statements
  //

  var active_requests = [];
  var completed_requests = [];
  var prepareds = [];

  var active_updated = "never"; // last update time
  var completed_updated = "never"; // last update time
  var prepareds_updated = "never"; // last update time

  qwQueryService.monitoring = {
    active_requests: active_requests,
    completed_requests: completed_requests,
    prepareds: prepareds,

    active_updated: active_updated,
    completed_updated: completed_updated,
    prepareds_updated: prepareds_updated,
  };

  qwQueryService.updateQueryMonitoring = updateQueryMonitoring;
  qwQueryService.runMonitoringQuery = runMonitoringQuery;
  qwQueryService.processMonitoringQueryResults = processMonitoringQueryResults;
  qwQueryService.getQueryServiceStats = getQueryServiceStats;
  qwQueryService.getQueryStats = getQueryStats;

  // for the front-end, distinguish error status and good statuses

  qwQueryService.status_success = status_success;
  qwQueryService.status_fail = status_fail;

  function status_success() {
    return (getCurrentResult().status_success());
  }

  function status_fail() {
    return (getCurrentResult().status_fail());
  }

  //
  // here are some options we use while querying
  //

  qwQueryService.options = {
    timings: true,
    auto_infer: true,
    auto_format: false,
    dont_save_queries: false,
    max_parallelism: "",
    scan_consistency: "not_bounded",
    positional_parameters: [],
    named_parameters: [],
    expanded: {},
    query_timeout: 600,
    transaction_timeout: 120,
    use_cbo: true,
  };

  qwQueryService.get_auto_format = function() {return qwQueryService.options.auto_format;};

  qwQueryService.set_options = function (new_options) {
    qwQueryService.options = new_options;
  };

  // clone options so we can have a scratch copy for the dialog box
  qwQueryService.clone_options = function () {
    return {
      timings: qwQueryService.options.timings,
      auto_infer: qwQueryService.options.auto_infer,
      auto_format: qwQueryService.options.auto_format,
      dont_save_queries: qwQueryService.options.dont_save_queries,
      max_parallelism: qwQueryService.options.max_parallelism,
      scan_consistency: qwQueryService.options.scan_consistency,
      positional_parameters: qwQueryService.options.positional_parameters.slice(0),
      named_parameters: qwQueryService.options.named_parameters.slice(0),
      expanded: qwQueryService.options.expanded,
      query_timeout: qwQueryService.options.query_timeout,
      transaction_timeout: qwQueryService.options.transaction_timeout,
      use_cbo: qwQueryService.options.use_cbo,
    };
  };

  //
  // a few variables for keeping track of the doc editor
  //

  qwQueryService.doc_editor_options = {
    selected_bucket: null,
    selected_scope: null,
    selected_collection: null,
    query_busy: false,
    show_tables: false,
    show_id: true, // show ID vs range of IDs
    limit: 10,
    offset: 0,
    where_clause: '',
    doc_id: '',
    doc_id_start: '',
    doc_id_end: '',
    current_query: '',
    current_result: []
  };

  qwQueryService.query_plan_options = {
    orientation: 1
  };

  //
  // this structure holds the current query text, the current query result,
  // and defines the object for holding the query history
  //

  function QueryResult(status, elapsedTime, executionTime, resultCount, resultSize, result,
                       data, query, requestID, explainResult, mutationCount, warnings, sortCount, lastRun, advice,
                       query_context_bucket, query_context_scope, chart_options) {
    this.status = status;
    this.resultCount = resultCount;
    this.mutationCount = mutationCount;
    this.resultSize = resultSize;
    this.result = result;
    this.data = data;
    this.query = query;
    this.query_context_bucket = query_context_bucket;
    this.query_context_scope = query_context_scope;
    this.requestID = requestID;
    this.explainResult = explainResult;
    if (explainResult)
      this.explainResultText = JSON.stringify(explainResult, null, '  ');
    else
      this.explainResultText = "";

    this.elapsedTime = truncateTime(elapsedTime);
    this.executionTime = truncateTime(executionTime);
    this.warnings = warnings;
    this.sortCount = sortCount;

    // when last run?
    this.lastRun = lastRun;

    // query advice
    this.advice = advice

    // chart config, if any
    this.chart_options = chart_options;
  };

  // elapsed and execution time come back with ridiculous amounts of
  // precision, and some letters at the end indicating units.

  function truncateTime(timeStr) {
    var timeEx = /([0-9.]+)([a-z]+)/i; // number + time unit string

    if (timeStr && timeEx.test(timeStr)) {
      var parts = timeEx.exec(timeStr);
      var num = Number(parts[1]).toFixed(2); // truncate number part
      if (!isNaN(num))
        return (num + parts[2]);
    }

    return (timeStr); // couldn't match, just return orig value
  }


  QueryResult.prototype.clone = function () {
    return new QueryResult(this.status, this.elapsedTime, this.executionTime, this.resultCount,
                           this.resultSize, this.result, this.data, this.query, this.requestID,
                           this.explainResult, this.mutationCount, this.warnings, this.sortCount,
                           this.lastRun, this.advice, this.query_context_bucket, this.query_context_scope,
                           this.chart_options);
  };

  QueryResult.prototype.status_success = function () {
    return (this.status == 'success' || this.status == 'explain success');
  };
  QueryResult.prototype.status_fail = function () {
    return (this.status == '400' ||
      this.status == 'errors' ||
      this.status == '500' ||
      this.status == '404' ||
      this.status == 'stopped' ||
      this.status == 'explain error');
  };

  QueryResult.prototype.set_chart_options = function(new_options) {
    this.chart_options = new_options;
  }

  QueryResult.prototype.set_query = function(new_query) {
    this.query = new_query;
  };

  QueryResult.prototype.get_query = function() {
    return(this.query);
  };
  //
  // clone a query object, but omit the data and plan (which might take lots of space)
  //

  var un_run_status = "Not yet run";
  var un_run_query_data = {"No data to display": "Hit execute to run query."};
  var un_run_query_text = JSON.stringify(un_run_query_data);

  QueryResult.prototype.clone_for_storage = function () {
    var res = new QueryResult(this.status, '', '', this.resultCount,
                              '',
                              un_run_query_text,
                              un_run_query_data,
                              this.query,
                              '',
                              un_run_query_data,
                              this.mutationCount, this.warnings, this.sortCount, this.lastRun,
                              '',
                              this.query_context_bucket, this.query_context_scope, this.chart_options
                             );

    res.explainResultText = un_run_query_text;

    return res;
  }

  QueryResult.prototype.hasData = function () {
    return (this.result !== un_run_query_text);
  }

  QueryResult.prototype.copyIn = function (other) {
    this.status = other.status;
    this.elapsedTime = truncateTime(other.elapsedTime);
    this.executionTime = truncateTime(other.executionTime);
    this.resultCount = other.resultCount;
    this.mutationCount = other.mutationCount;
    this.resultSize = other.resultSize;
    this.result = other.result;
    this.data = other.data;
    this.query = other.query;
    this.requestID = other.requestID;
    this.explainResult = other.explainResult;
    this.explainResultText = other.explainResultText;
    this.warnings = other.warnings;
    this.sortCount = other.sortCount;
    if (_.isString(other.lastRun))
      this.lastRun = new Date(other.lastRun);
    else
      this.lastRun = other.lastRun;
    this.status = other.status;
    this.advice = other.advice;
    this.query_context_bucket = other.query_context_bucket;
    this.query_context_scope = other.query_context_scope;
    this.chart_options = other.chart_options;
  };

  //
  // how recently was the query run (if at all)?
  //

  QueryResult.prototype.getLastRun = function () {
    // need a lastRun time to see how long ago it was
    if (!this.lastRun || !_.isDate(this.lastRun))
      return (null);

    var howRecent = (new Date().getTime() - this.lastRun.getTime()) / 1000;

    // if the query is still running, output how long
    if (this.busy) {
      var recentStr = "for ";
      if (howRecent < 60)
        recentStr += "less than a minute.";
      else if (howRecent > 60)
        recentStr += Math.round(howRecent / 60) + ' minutes';
      return recentStr;
    }

    // figure out how long ago it was
    var recentStr = '';
    if (howRecent < 60)
      recentStr += ' just now';
    else if (howRecent < 3600)
      recentStr += Math.round(howRecent / 60) + ' min ago';
    else if (howRecent < 86400)
      recentStr += Math.round(howRecent / 3600) + ' hrs ago';
    else
      recentStr += this.lastRun.toDateString(); //+ ' at ' + this.lastRun.getHours() + ':' + this.lastRun.getMinutes();

    return (recentStr);
  }

  QueryResult.prototype.getLastDetails = function () {
    var status = '';

    if (this.mutationCount)
      status += ', ' + this.mutationCount + ' mutations';
    else if (this.resultCount)
      status += ', ' + this.resultCount + ' documents';

    return (status);
  }

  //
  // structures for remembering queries and results
  //

  var dummyResult = new QueryResult('', '', '', '', '', '', {}, '');
  //var lastResult = dummyResult.clone();
  var savedResultTemplate = dummyResult.clone();
  savedResultTemplate.status = "";
  savedResultTemplate.result = un_run_query_text;
  savedResultTemplate.data = un_run_query_data;
  savedResultTemplate.explainResult = savedResultTemplate.data;
  savedResultTemplate.explainResultText = savedResultTemplate.result;

  var newQueryTemplate = dummyResult.clone();
  newQueryTemplate.status = un_run_status;
  newQueryTemplate.result = un_run_query_text;
  newQueryTemplate.data = un_run_query_data;

  var executingQueryTemplate = dummyResult.clone();
  executingQueryTemplate.status = "executing";
  executingQueryTemplate.result = '{"status": "Executing statement"}';
  executingQueryTemplate.data = {status: "Executing statement"};
  executingQueryTemplate.resultSize = 0;
  executingQueryTemplate.resultCount = 0;

  var pastQueries = [];       // keep a history of past queries and their results
  var currentQueryIndex = 0;  // where in the array are we? we start past the
                              // end of the array, since there's no history yet
  pastQueries.push(newQueryTemplate.clone()); // start off with a blank query

  function getCurrentResult() {
    // sanity checks to prevent MB-32954
    if (!pastQueries) pastQueries = [newQueryTemplate.clone()];
    if (currentQueryIndex < 0 || currentQueryIndex > pastQueries.length)
      currentQueryIndex = 0;
    if (!pastQueries[currentQueryIndex])
      pastQueries[currentQueryIndex] = newQueryTemplate.clone();
    return pastQueries[currentQueryIndex];
  }

  function emptyResult() {
    return (!pastQueries[currentQueryIndex] ||
      pastQueries[currentQueryIndex].result === savedResultTemplate.result);
  }

  //
  // where are we w.r.t. the query history?
  //

  function getCurrentIndex() {
    return (currentQueryIndex + 1) + "/" + (pastQueries.length == 0 ? 1 : pastQueries.length);
  }

  function getCurrentIndexNumber() {
    return (currentQueryIndex);
  }

  function setCurrentIndex(index = 0) {
    if (index < 0 || index >= pastQueries.length || index == currentQueryIndex)
      return;

    // if the current query was edited but not run, restore query to match results
    if (getCurrentResult().savedQuery && getCurrentResult().savedQuery != getCurrentResult().query)
      getCurrentResult().query = getCurrentResult().savedQuery;

    currentQueryIndex = index;

    // remember the current query in case the user edits it, then wants to revert
    getCurrentResult().savedQuery = getCurrentResult().query;
  }

  //
  // we want to store our state in the browser, if possible
  //

  function supportsHtml5Storage() {
    try {
      return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
      return false;
    }
  }

  var hasLocalStorage = supportsHtml5Storage();
  var localStorageKey = 'CouchbaseQueryWorkbenchState_' + window.location.host
    + qwConstantsService.localStorageSuffix;

  function loadStateFromStorage() {
    // make sure we have local storage

    //console.log("Trying to load from storage...");

    if (hasLocalStorage && _.isString(localStorage[localStorageKey])) try {
      var savedState = JSON.parse(localStorage[localStorageKey]);

      // copy all the saved options into our own structures
      Object.assign(qwQueryService.options,savedState.options);
      Object.assign(qwQueryService.doc_editor_options,savedState.doc_editor_options);
      Object.assign(monitoringOptions,savedState.monitoringOptions);

      // copy the query history
      if (savedState.pastQueries) {
        pastQueries = [];
        _.forEach(savedState.pastQueries, function (queryRes, index) {
          var newQuery = new QueryResult();
          newQuery.copyIn(queryRes);
          pastQueries.push(newQuery);
        });
      }

      // handle case of no queries in history
      if (pastQueries.length == 0)
        pastQueries.push(newQueryTemplate.clone());

      if (savedState.currentQueryIndex && savedState.currentQueryIndex < pastQueries.length)
        setCurrentIndex(savedState.currentQueryIndex);
      else
        setCurrentIndex(pastQueries.length - 1);

      getCurrentResult().savedQuery = getCurrentResult().query; // remember query if edited later

      //
      // backward compatibility: some options were missing in prior versions
      //

      if (!qwQueryService.options.expanded)
        qwQueryService.options.expanded = {};
      if (savedState.doc_editor_options) {
        if (!savedState.doc_editor_options.hasOwnProperty('show_tables'))
          savedState.doc_editor_options.show_tables = false;
        if (!savedState.doc_editor_options.hasOwnProperty('show_id'))
          savedState.doc_editor_options.show_id = true;
      }
      if (savedState.monitoringOptions && !monitoringOptions.active_sort_by) {
        monitoringOptions.active_sort_by = 'elapsedTime';
        monitoringOptions.active_sort_reverse = true;
        monitoringOptions.completed_sort_by = 'elapsedTime';
        monitoringOptions.completed_sort_reverse = true;
        monitoringOptions.prepared_sort_by = 'elapsedTime';
        monitoringOptions.prepared_sort_reverse = true;
      }

      if (qwQueryService.options.auto_infer !== true && qwQueryService.options.auto_infer !== false)
        qwQueryService.options.auto_infer = true;

      if (qwQueryService.options.auto_format !== true && qwQueryService.options.auto_format !== false)
        qwQueryService.options.auto_format = false;

      if (qwQueryService.options.dont_save_queries !== true && qwQueryService.options.dont_save_queries !== false)
        qwQueryService.options.dont_save_queries = false;

      if (qwQueryService.options.use_cbo !== true && qwQueryService.options.use_cbo !== false)
        qwQueryService.options.use_cbo = true;

      if (!qwQueryService.options.transaction_timeout)
        qwQueryService.options.transaction_timeout = 120;

    } catch (err) {
      console.log("Error loading state: " + err);
    }
  }


  function getQueryHistory(full) {
    // create a structure to hold the current state. To save state we will only
    // save queries, and not their results (which might well exceed the 5MB
    // we have available

    var savedState = {};
    savedState.pastQueries = [];
    savedState.outputTab = qwQueryService.outputTab;
    savedState.currentQueryIndex = currentQueryIndex;
    savedState.lastResult = getCurrentResult().clone_for_storage(); // for backward compatability
    savedState.options = qwQueryService.options;

    savedState.doc_editor_options = {
      selected_bucket: qwQueryService.doc_editor_options.selected_bucket,
      selected_scope: qwQueryService.doc_editor_options.selected_scope,
      selected_collection: qwQueryService.doc_editor_options.selected_collection,
      show_tables: qwQueryService.doc_editor_options.show_tables,
      show_id: qwQueryService.doc_editor_options.show_id,
      query_busy: false,
      limit: qwQueryService.doc_editor_options.limit,
      offset: qwQueryService.doc_editor_options.offset,
      where_clause: qwQueryService.doc_editor_options.where_clause,
      current_query: '',
      current_result: [] // don't want to save the results - they could be big
    };

    savedState.query_plan_options = {
      orientation: qwQueryService.query_plan_options.orientation
    };

    savedState.monitoringOptions = monitoringOptions;

    if (!qwQueryService.options.dont_save_queries) _.forEach(pastQueries, function (queryRes, index) {
      if (full)
        savedState.pastQueries.push(queryRes.clone());
      else
        savedState.pastQueries.push(queryRes.clone_for_storage());
    });

    return (JSON.stringify(savedState));
  }


  function saveStateToStorage() {
    // nop if we don't have local storage
    if (!hasLocalStorage)
      return;

    //console.log("saving state, len: " + JSON.stringify(savedState).length);

    // there is no cross browser means to determine how much local
    // storage space is available. When we get an exception, warn the user
    // and let them figure out what to do
    try {
      localStorage[localStorageKey] = getQueryHistory();
    } catch (e) {
      // if the save failed, notify the user
      showWarningDialog("Warning: Unable to save query history, browser local storage exhausted. You can still run queries, but they won't be saved for future sessions. Try removing large queries from history.")
    }
    //
    //console.log("Saving state to storage: ");
  }

  //
  // functions for adding new tokens and refreshing the token array
  //

  function addToken(token, type) {
    // see if the token needs to be quoted
    if (token.indexOf(' ') >= 0 || token.indexOf('-') >= 0 && !token.startsWith('`'))
      token = '`' + token + '`';

    // if the token isn't already there, add it
    if (!qwQueryService.autoCompleteTokens[token])
      qwQueryService.autoCompleteTokens[token] = type;

    // if the token is already known, but the type is new, add it to the list
    else if (qwQueryService.autoCompleteTokens[token].indexOf(type) == -1)
      qwQueryService.autoCompleteTokens[token] += ", " + type;
  };


  function refreshAutoCompleteArray() {
    qwQueryService.autoCompleteArray.length = 0;

    for (var key in qwQueryService.autoCompleteTokens) {
      //console.log("Got autoCompleteToken key: " + key);
      qwQueryService.autoCompleteArray.push(
        {caption: key, snippet: key, meta: qwQueryService.autoCompleteTokens[key]});
    }
  };


  //
  // go over a schema and recursively put all the field names in our name map
  //

  function getFieldNamesFromSchema(schema, prefix) {
    //console.log("Got schema: " + JSON.stringify(schema, null, 4));

    if (!prefix)
      prefix = '';

    for (var i = 0; i < schema.length; i++)
      _.forEach(schema[i]['properties'], function (field, field_name) {
        //console.log("Adding field prefix: " + prefix + ', field: ' +  field_name);
        //console.log("  field[properties]: " + field['properties']);
        //console.log("  field[items]: " + field['items']);
        //if (field['items'])
        // console.log("    field[items].subtype: " + field['items'].subtype);

        addToken(prefix + field_name, "field");
        //if (prefix.length == 0 && !field_name.startsWith('`'))
        //  addToken('`' + field_name + '`',"field");

        // if the field has sub-properties, make a recursive call
        if (field['properties']) {
          getFieldNamesFromSchema([field], prefix + field_name + ".");
        }

        // if the field has 'items', it is an array, make recursive call with array type
        if (field['items'] && field['items'].subtype) {
          getFieldNamesFromSchema([field['items'].subtype], prefix + field_name + "[0].");
        } else if (_.isArray(field['items'])) for (var i = 0; i < field['items'].length; i++)
          if (field['items'][i].subtype) {
            getFieldNamesFromSchema([field['items'][i].subtype], prefix + field_name + "[0].");
          }
      });
  }

  //
  // the UI can really only display a small number of fields in a schema, so truncate when necessary\
  //

  function truncateSchema(schema) {

    for (var i = 0; i < schema.length; i++) {
      var fieldCount = 0;
      var flavor = schema[i];

      _.forEach(schema[i]['properties'], function (field, field_name) {
        if (++fieldCount > 250) {
          flavor.truncated = true;
          delete flavor['properties'][field_name];
          return true;
        }

        // if the field has sub-properties, make a recursive call
        if (field['properties']) {
          truncateSchema([field]);
        }

        // if the field has 'items', it is an array, make recursive call with array type
        if (field['items'] && field['items'].subtype) {
          truncateSchema([field['items'].subtype]);
        } else if (_.isArray(field['items'])) for (var i = 0; i < field['items'].length; i++)
          if (field['items'][i].subtype) {
            truncateSchema([field['items'][i].subtype]);
          }
      });
    }

  }


  //
  // for error checking, it would be nice highlight when a specified field is not found
  // in a given schema
  //

  function isFieldNameInSchema(schema, fieldName) {
    // all schemas have the name "*"
    if (fieldName == "*")
      return true;
    // the field name might be a plain string, it might be suffixed with "[]", and it might
    // have a subfield expression starting with a "."
    var firstDot = fieldName.indexOf(".");
    var fieldPrefix = fieldName.substring(0, (firstDot >= 0 ? firstDot : fieldName.length));
    var fieldSuffix = (firstDot >= 0 ? fieldName.substring(firstDot + 1) : "");
    var arrayIndex = fieldPrefix.indexOf("[");
    if (arrayIndex >= 0)
      fieldPrefix = fieldPrefix.substring(0, fieldPrefix.indexOf("["));

    //console.log("fieldPrefix: *" + fieldPrefix + "* suffix: *" + fieldSuffix + "*");

    for (var i = 0; i < schema.length; i++) // for each flavor
      for (var field_name in schema[i]['properties']) {
        if (field_name == fieldPrefix) { // found a possible match
          //console.log("  got match");

          if (fieldSuffix.length == 0)  // no subfields? we're done, yay!
            return true;

          var field = schema[i]['properties'][field_name];

          //console.log("  looking for subproperties in field: " + JSON.stringify(field,null,2));
          // if we had an array expr, check each subtype's subfields against the array schema
          if (arrayIndex > -1 && _.isArray(field['items'])) {
            for (var arrType = 0; arrType < field['items'].length; arrType++)
              if (isFieldNameInSchema([field['items'][arrType].subtype], fieldSuffix))
                return true;
          } else if (arrayIndex > -1 && field.items.subtype) {
            if (isFieldNameInSchema([field.items.subtype], fieldSuffix))
              return true;
          }

          // if we have a non-array, check the subschema
          else if (arrayIndex == -1 && field['properties'] &&
            isFieldNameInSchema([field], fieldSuffix))
            return true;
        }
      }

    // if we get this far without finding it, return false
    return false;
  }

  //
  // we also keep a history of executed queries and their results
  // we will permit forward and backward traversal of the history
  //

  var tempResult = "Processing";
  var tempData = {status: "processing"};

  //
  // we can create a blank query at the end of history if we're at the last slot, and
  // the query there has already been run
  //

  function canCreateBlankQuery() {
    return (currentQueryIndex >= 0 &&
      currentQueryIndex == pastQueries.length - 1 &&
      getCurrentResult().query.trim() === pastQueries[pastQueries.length - 1].query.trim() &&
      getCurrentResult().status != newQueryTemplate.status);
  }

  function hasPrevResult() {
    return currentQueryIndex > 0;
  }

  // we can go forward if we're back in the history, or if we are at the end and
  // want to create a blank history element
  function hasNextResult() {
    return (currentQueryIndex < pastQueries.length - 1) ||
      canCreateBlankQuery();
  }

  function prevResult() {
    if (currentQueryIndex > 0) // can't go earlier than the 1st
    {
      // if the current query was edited but not run, restore query to match results
      if (getCurrentResult().savedQuery && getCurrentResult().savedQuery != getCurrentResult().query)
        getCurrentResult().query = getCurrentResult().savedQuery;

      currentQueryIndex--;

      getCurrentResult().savedQuery = getCurrentResult().query;
    }
  }

  function nextResult() {
    if (currentQueryIndex < pastQueries.length - 1) // can we go forward?
    {
      // if the current query was edited but not run, restore query to match results
      if (getCurrentResult().savedQuery && getCurrentResult().savedQuery != getCurrentResult().query)
        getCurrentResult().query = getCurrentResult().savedQuery;

      currentQueryIndex++;

      getCurrentResult().savedQuery = getCurrentResult().query;
    }

    // if the end query has been run, and is unedited, create a blank query
    else if (canCreateBlankQuery()) {
      var query_context_bucket = getCurrentResult().query_context_bucket;
      var query_context_scope = getCurrentResult().query_context_scope;
      addNewQueryAtEndOfHistory();
      getCurrentResult().query_context_bucket = query_context_bucket;
      getCurrentResult().query_context_scope = query_context_scope;
    }
  }

  function addNewQueryAtEndOfHistory(query) {
    // if the end of the history is a blank query, add it there.

    if (pastQueries.length > 0 && pastQueries[pastQueries.length - 1].query.length == 0) {
      pastQueries[pastQueries.length - 1].query = query;
    }

    // otherwise, add a new query at the end of history

    else {
      var newResult = newQueryTemplate.clone();
      if (query)
        newResult.query = query;
      else
        newResult.query = "";
      pastQueries.push(newResult);
    }

    currentQueryIndex = pastQueries.length - 1;
  }

  function addSavedQueryAtEndOfHistory(query) {
    var newResult = new QueryResult(); // create the right object
    newResult.copyIn(query);

    // if the end of the history is a blank query, add it there.

    if (pastQueries.length > 0 && pastQueries[pastQueries.length - 1].query.length == 0) {
      pastQueries[pastQueries.length - 1].query = newResult;
    }

    // otherwise, add a new query at the end of history

    else {
      pastQueries.push(newResult);
    }

    currentQueryIndex = pastQueries.length - 1;
  }

  //
  // clear the entire query history
  //

  function clearHistory() {
    let i;
    // don't clear the history if any queries are running
    for (i = 0; i < pastQueries.length; i++)
      if (pastQueries[i].busy)
        return;

    //lastResult.copyIn(dummyResult);
    pastQueries.length = 0;
    currentQueryIndex = 0;
    var newResult = newQueryTemplate.clone();
    pastQueries.push(newResult);

    saveStateToStorage(); // save current history
  }

  //
  // clear the specified query, or if none specified the current query
  //

  function clearCurrentQuery(index) {
    // don't clear the history if existing queries are already running
    if (qwQueryService.getCurrentResult().busy || pastQueries.length <= index)
      return;

    // did they specify an index to delete?
    var delIndex = (index || index === 0) ? index : currentQueryIndex;

    pastQueries.splice(delIndex, 1);
    if (currentQueryIndex >= pastQueries.length)
      currentQueryIndex = pastQueries.length - 1;

    //if (currentQueryIndex >= 0)
    //lastResult.copyIn(pastQueries[currentQueryIndex]);
    // did they delete everything?
//      else {
//        //lastResult.copyIn(dummyResult);
//        pastQueries.length = 0;
//        currentQueryIndex = 0;
//      }

    // make sure we have at least one query
    if (pastQueries.length == 0) {
      var newResult = newQueryTemplate.clone();
      pastQueries.push(newResult);
    }

    saveStateToStorage(); // save current history
  }

  //
  // cancelQuery - if a query is running, cancel it
  //

  function cancelQuery(queryResult) {
    // if this is a batch query, with multiple child queries, we need to find which one
    // is currently running, and cancel that.
    if (queryResult.batch_results) {
      let i;
      for (i = 0; i < queryResult.batch_results.length; i++) if (queryResult.batch_results[i].busy) {
        queryResult = queryResult.batch_results[i]; // cancel this child
        break;
      }
    }

    //console.log("Cancelling query, currentQuery: " + queryResult.client_context_id);
    if (queryResult && queryResult.client_context_id != null) {
      //var queryInFly = mnPendingQueryKeeper.getQueryInFly(queryResult.client_context_id);
      //queryInFly && queryInFly.canceler("test");

      queryResult.busy = false;
      queryResult.status = "Cancelling...";

      //
      // also submit a new query to delete the running query on the server
      //

      var query = 'delete from system:active_requests where clientContextID = "' +
        queryResult.client_context_id + '";';

      executeQueryUtil(query, false)

        .then(function success() {
            //console.log("Success cancelling query.");
            if (queryResult.status == "Cancelling...") {
              queryResult.status = "Cancelled";
              queryResult.data = {status: "Query cancelled"};
              queryResult.result = JSON.stringify(queryResult.data);
            }
          },

          // sanity check - if there was an error put a message in the console.
          function error(resp) {
            logWorkbenchError("Error cancelling query: " + JSON.stringify(resp));
            queryResult.status = "Cancellation Failed.";
            queryResult.data = {status: "Query cancelled", response: resp};
            queryResult.result = JSON.stringify(queryResult.data);
            //console.log("Error cancelling query.");
          });

    }
  }


  //
  // query monitoring might want to cancel queries this way

  function cancelQueryById(requestId) {
    //console.log("Cancelling query: " + requestId);
    var query = 'delete from system:active_requests where requestId = "' +
      requestId + '";';

    executeQueryUtil(query, false)

      .then(function success() {
//        console.log("Success cancelling query.");
        },

        // sanity check - if there was an error put a message in the console.
        function error(resp) {
          logWorkbenchError("Error cancelling query: " + JSON.stringify(resp));
//        var data = resp.data, status = resp.status;
//        console.log("Error cancelling query: " + query);
        });
  }

  //
  // we run queries many places, the following function calls qwHttp to run
  // the query, and returns the promise so the caller can handle success/failure callbacks.
  // queryText - the query to run
  // is_user_query - with user queries, we need to
  //   1) set a client_context_id to allow the query to be cancelled
  //   2) transform responses to handle ints > 53 bits long?
  //   3) set qwQueryService.currentQueryRequestID and qwQueryRequest.currentQueryRequest
  //

  function executeQueryUtil(queryText, is_user_query) {
    //console.log("Running query: " + queryText);
    var request = buildQueryRequest(queryText, is_user_query);

    // if the request can't be built because the query is too big, return a dummy
    // promise that resolves immediately. This needs to follow the angular qwHttp
    // promise, which supports .success and .error as well as .then

    if (!request) {
      var dummy = Promise.resolve({errors: "Query too long"});
      //dummy.success = function(fn) {/*nop*/ return(dummy);};
      //dummy.error = function(fn) {dummy.then(fn); return(dummy);};
      dummy.origThen = dummy.then;
      dummy.then = function (fn1, fn2) {
        dummy.origThen(fn1, fn2);
        return (dummy);
      };
      return (dummy);
    }

    if (qwHttp.do)
      return (qwHttp.do(request));
    else
      return (qwHttp(request));
  }

  //
  // query utility for new HttpClient with observables
  //

  function executeQueryUtilNew(queryText, is_user_query) {
    var request = buildQueryRequest(queryText, is_user_query);

    if (!request)
      return Observable.of({errors: "Query too long"});

    else return qwHttp.do_request(request);
  }

  //
  //
  //

  function logWorkbenchError(errorText) {
    if (qwHttp.do)
      qwHttp.do({
        url: "/logClientError",
        method: "POST",
        data: errorText,
      });
    else
      qwHttp({
        url: "/logClientError",
        method: "POST",
        data: errorText,
      });
  }

  function buildQueryRequest(queryText, is_user_query, queryOptions, txId, txImplicit, queryResult) {
    // sanity check on timeout time

    if (!_.isNumber(qwQueryService.options.query_timeout) ||
        qwQueryService.options.query_timeout == 0)
      qwQueryService.options.query_timeout = 600;

    // build basic query request
    let queryRequest = qwQueryServiceBase.buildQueryRequest(queryText,qwQueryService.options.query_timeout);
    let queryData = queryRequest.data;

    // are there options we need to add to the query request?

    if (queryOptions) {
      if (queryOptions.timings) // keep track of timings for each op?
        queryData.profile = "timings";

      if (queryOptions.max_parallelism && queryOptions.max_parallelism.length > 0)
        queryData.max_parallelism = queryOptions.max_parallelism;

      if (queryOptions.scan_consistency)
        queryData.scan_consistency = queryOptions.scan_consistency;

      // named and positional parameters
      if (queryOptions.positional_parameters && queryOptions.positional_parameters.length > 0)
        queryData.args = queryOptions.positional_parameters;

      if (queryOptions.named_parameters)
        for (var i = 0; i < queryOptions.named_parameters.length; i++)
          queryData[queryOptions.named_parameters[i].name] = queryOptions.named_parameters[i].value;

      if (is_user_query) {
        queryData.use_cbo = queryOptions.use_cbo;
        queryData.txtimeout = JSON.stringify(queryOptions.transaction_timeout) + "s";
      }
    }

    if (queryResult && queryResult.query_context_bucket) {
        queryData.query_context = 'default:' + queryResult.query_context_bucket +
          (queryResult.query_context_scope ? ('.' + queryResult.query_context_scope) + '' : '');
    }

    // if the user might want to cancel it, give it an ID

    if (is_user_query) {
      queryData.client_context_id = qwQueryServiceBase.UUID.generate();
      queryData.pretty = true;
      queryData.controls = true;
      if (txId)
        queryData.txid = txId;
      queryData.tximplicit = txImplicit;
    }

    // if it's a userQuery, make sure to handle really long ints, and remember the
    // request in case we need to cancel

    if (is_user_query) {
      queryRequest.transformResponse = qwFixLongNumberService.fixLongInts;
      qwQueryService.currentQueryRequest = queryRequest;
    }

    //
    // check the queryRequest to make sure it's not too big
    //

    if (qwConstantsService.maxRequestSize &&
      JSON.stringify(queryRequest).length >= qwConstantsService.maxRequestSize) {
      showErrorDialog("Query too large for GUI, try using CLI or REST API directly.")
      return (null);
    }

    //console.log("Built query: " + JSON.stringify(queryRequest));
    return (queryRequest);
  }

  //
  // convenience function to see if fields mentioned in a query are not found in the schema
  // for the buckets involved
  //

  function getProblemFields(fields) {
    var problem_fields = [];

    for (var f in fields) {
      var lastDot = f.lastIndexOf(".");
      var collectionName = f.substring(0, lastDot);
      var fieldName = f.substring(lastDot + 1);
      //console.log("Checking field: " + f + ", bucket: " + bucketName);
      var collection = null;
      qwQueryService.buckets.forEach(bucket => {
        if (collectionName.startsWith(bucket.id)) {
          let coll = bucket.collections.find(coll => collectionName == coll.bucket + '.' + coll.scope + '.' + coll.id);
          if (coll != null)
            collection = coll;
        }
      });
      if (collection && collection.schema.length > 0 && !isFieldNameInSchema(collection.schema, fieldName)) {
          problem_fields.push({field: fieldName, bucket: collectionName});
      }
    }

    return (problem_fields);
  }

  //
  // executeUserQuery
  //
  // take a query from the user, or possibly a string containing multiple queries separated by semicolons,
  // and execute them, updating the UI to show progress
  //

  function executeUserQuery(explainOnly,txImplicit) {
    // if the user edited an already-run query, add the edited query to the end of the history

    var query = getCurrentResult();
    if (query.savedQuery && query.savedQuery != query.query && query.lastRun) {
      var result = executingQueryTemplate.clone();
      result.query = query.query.trim();
      pastQueries.push(result);
      currentQueryIndex = pastQueries.length - 1; // after run, set current result to end
      query.query = query.savedQuery; // restore historical query to original value
    }

    // make sure that the current query isn't already running
    if (getCurrentResult().busy)
      return(Promise.resolve('query busy, nothing to do'));

    getCurrentResult().busy = true;

    // clear any previous results, remember when we started
    var queryText = getCurrentResult().query;
    var query_context_bucket = query.query_context_bucket;
    var query_context_scope = query.query_context_scope;

    var newResult = getCurrentResult();
    newResult.copyIn(executingQueryTemplate);
    newResult.query = queryText;
    newResult.query_context_bucket = query_context_bucket;
    newResult.query_context_scope = query_context_scope;
    newResult.savedQuery = queryText;
    newResult.lastRun = new Date();

    // if we have multiple queries, pull them apart into an array so we can run them
    // in sequence
    var queries = [];
    var curQuery = '';
    var findSemicolons = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/\*(?:.|[\n\r])*\*\/)|(`(?:[^`]|``)*`)|((?:[^;"'`\/]|\/(?!\*))+)|(;)/g;
    var matchArray = findSemicolons.exec(queryText);

    while (matchArray != null) {
      //console.log("Got matchArray: " + JSON.stringify(matchArray));
      curQuery += matchArray[0];
      if (matchArray[0] == ';') {
        queries.push(curQuery);
        curQuery = '';
      }
      matchArray = findSemicolons.exec(queryText);
    }

    if (curQuery.length > 0)
      queries.push(curQuery); // get final query if unterminated with ;

    //console.log("Got queries: " + JSON.stringify(queries));

    // if we have a single query, run it. If we have multiple queries, run each one in sequence,
    // stopping if we see an error by chaining the promises together
    var queryExecutionPromise;

    if (queries.length > 1) {
      newResult.batch_results = [];
      newResult.busy = true;

      for (var i = 0; i < queries.length; i++)
        newResult.batch_results.push(newQueryTemplate.clone());

      // if we have a query context, make sure the children have it as well
      if (newResult.query_context_bucket)
        newResult.batch_results.forEach(child => {
          child.query_context_bucket = newResult.query_context_bucket;
          child.query_context_scope = newResult.query_context_scope;
        });

      newResult.explainResult = "Graphical plans not available for multiple query sequences.";
      queryExecutionPromise = runBatchQuery(newResult, queries, 0, explainOnly);
    }

    // otherwise only a single query, run it
    else
      queryExecutionPromise = executeSingleQuery(queryText, explainOnly, newResult, null, txImplicit)
        .then(
          function success() {
            if (!newResult.status_success()) // if errors, go to tab 1
              qwQueryService.selectTab(1);
          },
          function error() {
            qwQueryService.selectTab(1);
          }) // error, go to tab 1
        // when done, save the current state
        .finally(function () {
          saveStateToStorage(); /*finishQuery(newResult);*/
        });

    return (queryExecutionPromise);
  }

  //
  // recursive function to run queries one after the other
  //

  function runBatchQuery(parentResult, queryArray, curIndex, explainOnly, txId) {

    // if we successfully executed the final query, set the parent status to the status of the last query
    if (curIndex >= queryArray.length) {
      finishParentQuery(parentResult, parentResult.batch_results.length - 1, false);
      return (Promise.resolve); // success!
    }

    // launch a query
    parentResult.status = "Executing " + (curIndex + 1) + "/" + queryArray.length;

    return executeSingleQuery(queryArray[curIndex], explainOnly, parentResult.batch_results[curIndex], txId).then(
      function success(resp) {
        if (parentResult.batch_results[curIndex].stmtType == "START_TRANSACTION")
          txId = parentResult.batch_results[curIndex].data[0].txid;
        else if (parentResult.batch_results[curIndex].stmtType == "COMMIT" ||
          parentResult.batch_results[curIndex].stmtType == "ROLLBACK")
          txId = null;
        addBatchResultsToParent(parentResult, curIndex);

        // only run the next query if this query was a success
        if (parentResult.batch_results[curIndex].status_success()) {
          runBatchQuery(parentResult, queryArray, curIndex + 1, explainOnly, txId);
        }
        // with failure, end the query
        else
          finishParentQuery(parentResult, curIndex, true);
      },
      // if we get failure, the parent status is the status of the last query to run
      function fail(resp) {
        parentResult.batch_results[curIndex].status = resp.statusText;
        if (resp.data && resp.data.errors)
          parentResult.batch_results[curIndex].data = resp.data.errors;
        else
          parentResult.batch_results[curIndex].data = resp.statusText;
        addBatchResultsToParent(parentResult, curIndex);
        finishParentQuery(parentResult, curIndex, true);
      }
    );
  }

  //
  // each time a child query finishes, add their results to the parent
  //

  function addBatchResultsToParent(parentResult, childIndex) {
    // is the parent set up for data yet?
    if (parentResult.result == executingQueryTemplate.result) {
      parentResult.data = [];
      parentResult.explainResult = [];
      parentResult.result = '';
      parentResult.explainResultText = '';
    }
      // otherwise we need to create a new parent result array so that the
    // directives doing $watch notice the change
    else {
      var newData = parentResult.data.slice();
      parentResult.data = newData;
    }

    // add the latest result
    parentResult.data.push({
        _sequence_num: childIndex + 1,
        _sequence_query: parentResult.batch_results[childIndex].query,
        _sequence_query_status: parentResult.batch_results[childIndex].status,
        _sequence_result: parentResult.batch_results[childIndex].data
      }
    );
    parentResult.explainResult.push({
      _sequence_num: childIndex + 1,
      _sequence_query: parentResult.batch_results[childIndex].query,
      _sequence_result: parentResult.batch_results[childIndex].explainResult
    });

    parentResult.result = JSON.stringify(parentResult.data, null, '  ');
    parentResult.explainResultText = JSON.stringify(parentResult.explainResult, null, '  ');
  }

  //
  // when the children are done, finish the parent
  //

  function finishParentQuery(parentResult, index, isError) {
    // the parent gets its status from the last query to run
    parentResult.status = parentResult.batch_results[index].status;

    // mark the parent as done, if errors were seen select tab 1, then save the history
    finishQuery(parentResult);
    if (isError)
      qwQueryService.selectTab(1);
    saveStateToStorage();
  }

  //
  // time values in metrics can get really ugly, e.g. 1.23423423432s or 334.993843ms
  //
  // let's round them
  //

  function simplifyTimeValue(timeValue) {
    var durationExpr = /(\d+m)?(?:(\d+\.\d+)s)?(?:(\d+\.\d+)ms)?(?:(\d+\.\d+)µs)?/;
    var result = '';

    var m = timeValue.match(durationExpr);

    if (m[1]) result += m[1];
    if (m[2]) {
      var seconds = Math.round(parseFloat(m[2]) * 10) / 10;
      result += seconds + 's';
    }
    if (m[3]) {
      var ms = Math.round(parseFloat(m[3]) * 10) / 10;
      result += ms + 'ms';
    }
    if (m[4]) {
      var us = Math.round(parseFloat(m[4]) * 10) / 10;
      result += us + 'µs';
    }
    return (result)
  }

  //
  // when we have a single query, associated with a query result in the history,
  // we have a specific process to execute it:
  //
  // - mark the query as busy - we don't want to execute multiple times
  // - should we run EXPLAIN separately? If so, do it, update the query result
  // - should we run the plain query? If so, do it, update the query result
  // - return a promise resolving when either/both of those queries completes,
  //   marking the query as no longer busy when that happens
  //

  function executeSingleQuery(queryText, explainOnly, newResult, txId, txImplicit) {
    var pre_post_ms = new Date().getTime(); // when did we start?
    var promises = []; // we may run explain only, or explain + actual  query
    //console.log("Running query: " + queryText);

    // remember the query context
    var query_context_bucket = newResult.query_context_bucket;
    var query_context_scope = newResult.query_context_scope;

    // make sure the result is marked as executing
    newResult.copyIn(executingQueryTemplate);
    newResult.query = queryText;
    newResult.query_context_bucket = query_context_bucket;
    newResult.query_context_scope = query_context_scope;
    newResult.busy = true;
    newResult.savedQuery = queryText;
    newResult.lastRun = new Date();

    //
    // if the query is not already an explain, run a version with explain to get the query plan,
    // unless the query is prepare - we can't explain those
    //

    var queryIsExplain = /^\s*explain/gi.test(queryText);
    var queryIsPrepare = /^\s*prepare/gi.test(queryText);
    var queryIsAdvise = /^\s*advise/gi.test(queryText);
    var queryIsTransaction = /^\s*(begin|start|commit|rollback|savepoint)/gi.test(queryText);
    var explain_promise;

    // the result tabs can show data, explain results, or show advice. Make sure the tab setting is
    // appropriate for the query type
    switch (qwQueryService.outputTab) {
      case 1: // JSON
      case 2: // Table
      case 3: // Tree
        if (explainOnly)
          qwQueryService.selectTab(4); // vis for EE, text for CE
        else if (queryIsAdvise)
          qwQueryService.selectTab(6);
        // otherwise don't change it
        break;
      case 4: // visual plan
      case 5: // plan text
        if (!queryIsExplain && !explainOnly && !queryIsAdvise)
          qwQueryService.selectTab(1);
        else if (queryIsAdvise)
          qwQueryService.selectTab(6);
        break;
      case 6: // advice tab
        if (!queryIsExplain && !explainOnly && !queryIsAdvise)
          qwQueryService.selectTab(1);
        else if (queryIsExplain || explainOnly)
          qwQueryService.selectTab(4); // vis for EE, text for CE
        break;
    }

    //
    // run the explain version of the query, if appropriate
    //

    if (!queryIsExplain && !queryIsTransaction && !queryIsAdvise &&
      (explainOnly || (qwConstantsService.autoExplain && !queryIsPrepare))) {

      var explain_request = buildQueryRequest("explain " + queryText, false, qwQueryService.options, null, null, newResult);
      if (!explain_request) {
        newResult.result = '{"status": "query failed"}';
        newResult.data = {status: "Query Failed."};
        newResult.status = "errors";
        newResult.resultCount = 0;
        newResult.resultSize = 0;

        // can't recover from error, finish query
        finishQuery(newResult);
        return (Promise.reject("building query failed"));
      }
      if (qwHttp.do)
        explain_promise = qwHttp.do(explain_request);
      else
        explain_promise = qwHttp(explain_request);

      explain_promise
        .then(function success(resp) {
            var data = resp.data, status = resp.status;
            //
            //console.log("explain success: " + JSON.stringify(data));

            // if the query finished first and produced a plan, ignore
            // the results of the 'explain'. Only proceed if no explainResult

            if (!newResult.explainResult) {
              // now check the status of what came back
              if (data && data.status == "success" && data.results && data.results.length > 0) try {

                // if we aren't running a regular query, set the status for explain-only
                if (!((queryIsExplain && explainOnly) || !explainOnly))
                  newResult.status = "explain success";

                if (data.metrics && newResult.elapsedTime != '') {
                  newResult.elapsedTime = simplifyTimeValue(data.metrics.elapsedTime);
                  newResult.executionTime = simplifyTimeValue(data.metrics.executionTime);
                  newResult.resultCount = data.metrics.resultCount;
                  newResult.mutationCount = data.metrics.mutationCount;
                  newResult.resultSize = data.metrics.resultSize;
                  newResult.sortCount = data.metrics.sortCount;
                }

                var lists = qwQueryPlanService.analyzePlan(data.results[0].plan, null);
                newResult.explainResultText = JSON.stringify(data.results[0].plan, null, '    ');
                newResult.explainResult =
                  {
                    explain: data.results[0],
                    analysis: lists,
                    plan_nodes: qwQueryPlanService.convertN1QLPlanToPlanNodes(data.results[0].plan, null, lists)
                  };

                if (_.isArray(lists.warnings) && lists.warnings.length > 0)
                  newResult.warnings = JSON.stringify(lists.warnings);

                // let's check all the fields to make sure they are all valid
                var problem_fields = getProblemFields(newResult.explainResult.analysis.fields);
                if (problem_fields.length > 0)
                  newResult.explainResult.problem_fields = problem_fields;
              }
                // need to handle any exceptions that might occur
              catch (exception) {
                console.log("Exception analyzing query plan: " + exception);
                newResult.explainResult = "Internal error generating query plan: " + exception;
                newResult.explainResultText = "Internal error generating query plan: " + exception;
                newResult.status = "explain error";
              }

              // if status != success
              else if (data.errors) {
                newResult.explainResult = data.errors;
                newResult.explainResult.query = explain_request.data.statement;
                newResult.explainResultText = JSON.stringify(data.errors, null, '    ');
                newResult.status = "explain error";
              } else {
                newResult.explainResult = {'error': 'No server response for explain.'};
                newResult.explainResultText = JSON.stringify(newResult.explainResult, null, '    ');
                newResult.status = "explain error";
              }
            }
          },
          /* error response from qwHttp */
          function error(resp) {
            var data = resp.data, status = resp.status;
            //console.log("Explain error Data: " + JSON.stringify(data));
            //console.log("Explain error Status: " + JSON.stringify(status));

            // if we aren't running a regular query, set the status for explain-only
            if (!((queryIsExplain && explainOnly) || !explainOnly))
              newResult.status = status || "explain error";

            // we only want to pay attention to the result if the query hasn't finished
            // already and generated a more definitive query plan

            if (!newResult.explainResult) {

              if (data && _.isString(data)) {
                newResult.explainResult = {errors: data};
                newResult.explainResult.query_from_user = explain_request.data.statement;
              } else if (data && data.errors) {
                if (data.errors.length > 0)
                  data.errors[0].query_from_user = explain_request.data.statement;
                newResult.explainResult = {errors: data.errors};
              } else {
                newResult.explainResult = {errors: "Unknown error getting explain plan"};
                newResult.explainResult.query_from_user = explain_request.data.statement;
              }

              newResult.explainResultText = JSON.stringify(newResult.explainResult, null, '  ');

              // if the query hasn't returned metrics, include the explain metrics,
              // so they know how long it took before the error

              if (data && data.metrics && newResult.elapsedTime != '') {
                newResult.elapsedTime = simplifyTimeValue(data.metrics.elapsedTime);
                newResult.executionTime = simplifyTimeValue(data.metrics.executionTime);
                newResult.resultCount = data.metrics.resultCount;
                newResult.mutationCount = data.metrics.mutationCount;
                newResult.resultSize = data.metrics.resultSize;
                newResult.sortCount = data.metrics.sortCount;
              }
            }

            return (Promise.resolve()); // don't want to short circuit resolution of other promises
          });

      promises.push(explain_promise);
    }

    //
    // Run the query as typed by the user?
    // - Above, we might have run it with "EXPLAIN" added to the beginning.
    // - If the user clicked "Explain", we only run the query if it already has "EXPLAIN" in the text
    // - If the user clicked "Execute", go ahead and run the query no matter how it looks.
    //

    if ((queryIsExplain && explainOnly) || !explainOnly) {

      var request = buildQueryRequest(queryText, true, qwQueryService.options, txId, txImplicit, newResult);
      newResult.client_context_id = request.data.client_context_id;
      //console.log("Got client context id: " + newResult.client_context_id);

      if (!request) {
        newResult.result = '{"status": "Query Failed."}';
        newResult.data = {status: "Query Failed."};
        newResult.status = "errors";
        newResult.resultCount = 0;
        newResult.resultSize = 0;

        // make sure to only finish if the explain query is also done
        return (Promise.reject("building explain query failed"));
      }
      var query_promise;

      if (qwHttp.do)
        query_promise = qwHttp.do(request);
      else
        query_promise = qwHttp(request);

      //console.log("Running request:" + JSON.stringify(request,null,2));
      // SUCCESS!
      query_promise
        .then(function success(resp) {
            var data = resp.data, status = resp.status;
            //console.log("Success for query: " + queryText);
            //console.log("Success Data: " + JSON.stringify(data));
            //console.log("Success Status: " + JSON.stringify(status));

            // Even though we got a successful HTTP response, it might contain warnings or errors
            // We need to be able to show both errors and partial results, or if there are no results
            // just the errors

            var result; // hold the result, or a combination of errors and result

          if (!data) {
            result = {status: "No data returned from server"};
            data = {status: status};
          }
            // empty result, fill it with any errors or warnings
          else if (!_.isArray(data.results) || data.results.length == 0) {
              if (data.errors)
                result = data.errors;
              else if (data.warnings)
                result = data.warnings;

              // otherwise show some context, make it obvious that results are empty
              else {
                result = {};
                result.results = data.results;
              }
            }
            // non-empty result: use it
            else
              result = data.results;

            // if we have results, but also errors, record them in the result's warning object
            if (data.warnings && data.errors)
              newResult.warnings = "'" + JSON.stringify(data.warnings, null, 2) + JSON.stringify(data.errors, null, 2) + "'";
            else if (data.warnings)
              newResult.warnings = "'" + JSON.stringify(data.warnings, null, 2) + "'";
            else if (data.errors)
              newResult.warnings = "'" + JSON.stringify(data.errors, null, 2) + "'";
            if (data.status == "stopped") {
              result = {status: "Query stopped on server."};
            }

            // if we got no metrics, create a dummy version
            if (!data.metrics) {
              data.metrics = {elapsedTime: "0.0s", executionTime: "0.0s", resultCount: 0, resultSize: "0"};
            }

            // get the stmtType to keep track of transactions
            if (data.controls) {
              newResult.stmtType = data.controls.stmtType;
              newResult.use_cbo = data.controls.use_cbo;
            }

            newResult.status = data.status;
            newResult.elapsedTime = simplifyTimeValue(data.metrics.elapsedTime);
            newResult.executionTime = simplifyTimeValue(data.metrics.executionTime);
            newResult.resultCount = data.metrics.resultCount;
            if (data.metrics.mutationCount)
              newResult.mutationCount = data.metrics.mutationCount;
            newResult.resultSize = data.metrics.resultSize;
            newResult.sortCount = data.metrics.sortCount;
            if (data.rawJSON)
              newResult.result = data.rawJSON;
            else
              newResult.result = angular.toJson(result, true);
            newResult.data = result;
            newResult.requestID = data.requestID;

            // did we get query timings in the result? If so, update the plan

            if (data.profile && data.profile.executionTimings) try {
              var lists = qwQueryPlanService.analyzePlan(data.profile.executionTimings, null);
              newResult.explainResult =
                {
                  explain: data.profile.executionTimings,
                  analysis: lists,
                  plan_nodes: qwQueryPlanService.convertN1QLPlanToPlanNodes(data.profile.executionTimings, null, lists)
                };
              newResult.explainResultText = JSON.stringify(newResult.explainResult.explain, null, '  ');

              // let's check all the fields to make sure they are all valid
              var problem_fields = getProblemFields(newResult.explainResult.analysis.fields);
              if (problem_fields.length > 0)
                newResult.explainResult.problem_fields = problem_fields;
            }

              // need to handle any exceptions that might occur
            catch (exception) {
              console.log("Exception analyzing query plan: " + exception);
              newResult.explainResult = "Internal error generating query plan: " + exception;
            }

            // if this was an explain query, analyze the results to get us a graphical plan

            if (queryIsExplain && data.results && data.results[0] && data.results[0].plan) try {
              var lists = qwQueryPlanService.analyzePlan(data.results[0].plan, null);
              newResult.explainResult =
                {
                  explain: data.results[0],
                  analysis: lists,
                  plan_nodes: qwQueryPlanService.convertN1QLPlanToPlanNodes(data.results[0].plan, null, lists)
                  /*,
                buckets: qwQueryService.buckets,
                tokens: qwQueryService.autoCompleteTokens*/
                };
              newResult.explainResultText = JSON.stringify(newResult.explainResult.explain, null, '  ');
            }
              // need to handle any exceptions that might occur
            catch (exception) {
              console.log("Exception analyzing query plan: " + exception);
              newResult.explainResult = "Internal error generating query plan: " + exception;
              //newResult.explainResultText = "Internal error generating query plan: " + exception;
            }

            // if the query was "advice select...", make sure the result gets put into advice

            if (queryIsAdvise) {
              if (data && data.status == "success" && data.results && data.results.length > 0)
                newResult.advice = data.results[0].advice.adviseinfo;
              else
                newResult.advice = newResult.result; // get the error message
            }


          },
          /* error response from qwHttp */
          function error(resp) {
            var data = resp.data, status = resp.status;
            //console.log("Error for query: " + queryText);
            //console.log("Error resp: " + JSON.stringify(resp));
            //console.log("Error Data: " + JSON.stringify(data));

            // if we don't get query metrics, estimate elapsed time
            if (!data || !data.metrics) {
              var post_ms = new Date().getTime();
              newResult.elapsedTime = (post_ms - pre_post_ms) + "ms";
              newResult.executionTime = newResult.elapsedTime;
            }

            // no result at all? failure
            if (data === undefined) {
              newResult.result = '{"status": "Failure contacting server."}';
              newResult.data = {status: "Failure contacting server."};
              newResult.status = "errors";
              newResult.resultCount = 0;
              newResult.resultSize = 0;
              return;
            }

            // data is null? query interrupted
            if (data === null) {
              newResult.result = '{"status": "Query interrupted."}';
              newResult.data = {status: "Query interrupted."};
              newResult.status = "errors";
              newResult.resultCount = 0;
              newResult.resultSize = 0;
              return;
            }

            // result is a string? it must be an error message
            if (_.isString(data)) {
              newResult.data = {status: data};
              if (status && status == 504) {
                newResult.data.status_detail =
                  "The query workbench only supports queries running for " + qwQueryService.options.query_timeout +
                  " seconds. This value can be changed in the preferences dialog. You can also use cbq from the " +
                  "command-line for longer running queries. " +
                  "Certain DML queries, such as index creation, will continue in the " +
                  "background despite the user interface timeout.";
              }

              newResult.result = JSON.stringify(newResult.data, null, '  ');
              newResult.status = "errors";
              return;
            }

            if (data.errors) {
              if (_.isArray(data.errors) && data.errors.length >= 1)
                data.errors[0].query = queryText;
              newResult.data = data.errors;
              newResult.result = JSON.stringify(data.errors, null, '  ');
            }

            if (status)
              newResult.status = status;
            else
              newResult.status = "errors";

            if (data.metrics) {
              newResult.elapsedTime = simplifyTimeValue(data.metrics.elapsedTime);
              newResult.executionTime = simplifyTimeValue(data.metrics.executionTime);
              newResult.resultCount = data.metrics.resultCount;
              if (data.metrics.mutationCount)
                newResult.mutationCount = data.metrics.mutationCount;
              newResult.resultSize = data.metrics.resultSize;
              newResult.sortCount = data.metrics.sortCount;
            }

            if (data.requestID)
              newResult.requestID = data.requestID;

            // make sure to only finish if the explain query is also done
            if (newResult.explainDone) {
              // when we have errors, don't show the plan tabs
              if (qwQueryService.isSelected(4) || qwQueryService.isSelected(5))
                qwQueryService.selectTab(1);
            }

            return (Promise.resolve()); // don't want to short circuit resolution of other promises
          });

      promises.push(query_promise);
    }

    //
    // let's run ADVISE on the query to see if there's a better way to do it
    // but only if we're in EE mode
    //

    if (!explainOnly && !queryIsExplain && !queryIsAdvise && !queryIsTransaction &&
      qwMetadataService.isEnterprise()) {
      var advise_promise = runAdvise(queryText, newResult);
      if (advise_promise != null)
        promises.push(advise_promise);
    }

    // return a promise wrapping the one or two promises
    // when the queries are done, call finishQuery

    var all_done = Promise.all(promises);
    all_done.then(
      function success() {
        finishQuery(newResult);
      },
      function fail() {
        finishQuery(newResult);
      }
    );
    return(all_done);
  }

  //
  // run ADVISE for a given query and queryResult, without also running the query or explain
  //

  function runAdviseOnLatest() {
    var query = getCurrentResult();
    var queryIsAdvise = /^\s*advise/gi.test(query.query);

    // if the query already starts with 'advise', run it as a regular query
    if (queryIsAdvise) {
      var promise = executeUserQuery(false);
      qwQueryService.selectTab(1);
      return promise;
    }

    // if the user edited an already-run query, add the edited query to the end of the history
    if (query.savedQuery && query.savedQuery != query.query && query.lastRun) {
      var result = executingQueryTemplate.clone();
      result.query = query.query.trim();
      pastQueries.push(result);
      currentQueryIndex = pastQueries.length - 1; // after run, set current result to end
      query.query = query.savedQuery; // restore historical query to original value
      query = getCurrentResult();
      saveStateToStorage();
    }

    var initialAdvice = "Getting advice for current query...";
    query.advice = initialAdvice;
    query.result = query.advice;
    query.data = {status: query.result};
    query.warnings = null;
    qwQueryService.selectTab(6);
    return runAdvise(getCurrentResult().query, getCurrentResult())
    .then(
      function success(resp) {
        if (query.advice == initialAdvice) {
          query.data = {adviseResult: resp};
          query.advice = resp;
        }
        else
          query.data = {adviseResult: query.advice};

        query.result = JSON.stringify(query.data, null, 2);

        if (_.isString(query.advice))
          query.status = "advise error";
        else
          query.status = "success";

        finishQuery(query);
      },
      function err(resp) {
        query.advice = 'Error generating query advice';
        if (resp.data && resp.data.errors)
          query.advice += ": " + JSON.stringify(resp.data.errors);
        query.result = query.advice;
        query.data = {adviseResult: query.result};
        query.status = "advise error";
        finishQuery(query);
      });

  };

  function runAdvise(queryText, queryResult) {
    queryResult.lastRun = new Date();

    var queryIsAdvisable = /^\s*(select|merge|update|delete)/gi.test(queryText);

    if (queryIsAdvisable && !multipleQueries(queryText)) {
      var advise_request = buildQueryRequest("advise " + queryText, false, qwQueryService.options, null, null, queryResult);
      // log errors but ignore them
      if (!advise_request) {
        console.log("Couldn't build Advise query. ");
        return (Promise.resolve("building advise query failed"));
      }
      var advise_promise;

      if (qwHttp.do)
        advise_promise = qwHttp.do(advise_request);
      else
        advise_promise = qwHttp(advise_request);

      return advise_promise
        .then(function success(resp) {
            var data = resp.data, status = resp.status;
            //
            // if the query finished first and produced a plan, ignore
            // the results of the 'explain'. Only proceed if no explainResult

            // now check the status of what came back
            if (data && data.status == "success" && data.results && data.results.length > 0) try {
              //console.log("Advise success: " + JSON.stringify(data.results[0]));
              queryResult.advice = data.results[0].advice.adviseinfo;
            }
              // need to handle any exceptions that might occur
            catch (exception) {
              console.log("Exception analyzing advise plan: " + exception);
            }

            // if status != success
            else if (data.errors) {
              console.log("Advise errors: " + JSON.stringify(data.errors, null, '    '));
              queryResult.advice = "Error getting index advice, status: " + status;
              if (status == 504)
                queryResult.advice += " (server timeout)";
              if (data && _.isArray(data.errors))
                data.errors.forEach(function (err) {
                  queryResult.advice += ", " + err.msg;
                });
            } else {
              console.log("Unknown advise response: " + JSON.stringify(resp));
              queryResult.advice = "Unknown response from server.";
            }
          },
          /* error response from qwHttp, log error but otherwise ignore */
          function error(resp) {
            var data = resp.data, status = resp.status;
            //console.log("Advise error Data: " + JSON.stringify(data));
            //console.log("Advise error Status: " + JSON.stringify(status));
            queryResult.advice = "Error getting index advice, status: " + status;
            if (status == 504)
              queryResult.advice += " (server timeout)";
            if (data && _.isArray(data.errors))
              data.errors.forEach(function (err) {
                queryResult.advice += ", " + err.msg;
              });

            return (Promise.resolve('advise failed')); // don't want to short circuit resolution of other promises
          });
    }

    return (Promise.resolve("Query is not advisable"));
  }

  // convenience function to determine whether a query result has actionable advice
  function hasRecommendedIndex(queryResult) {
    if (!queryResult || !queryResult.advice || !_.isArray(queryResult.advice))
      return false;

    return (queryResult.advice.some(function (element) {
      return element.recommended_indexes &&
        (element.recommended_indexes.covering_indexes || element.recommended_indexes.indexes);
    }));
  }

  // split a set of semi-colon-delimited queries into an array of queries
  function multipleQueries(queryText) {
    var findSemicolons = /("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\/\*(?:.|[\n\r])*\*\/)|(`(?:[^`]|``)*`)|((?:[^;"'`\/]|\/(?!\*))+)|(;)/g;
    var matchArray = findSemicolons.exec(queryText);
    var queryCount = 0;

    while (matchArray != null) {
      if (matchArray[0] == ';')
        if (queryCount++ > 1)
          return true;
      matchArray = findSemicolons.exec(queryText);
    }
    return false;
  }

  //
  // whenever a query finishes, we need to set the state to indicate the query
  // is not longer running.
  //

  function finishQuery(runningQuery) {
    // if we have an explain result and not a regular result, copy
    // the explain result to the regular result
    if (runningQuery.result == executingQueryTemplate.result) {
      runningQuery.result = runningQuery.explainResultText;
      runningQuery.data = runningQuery.explainResult;
    }

    runningQuery.currentQueryRequest = null;  // no query running
    runningQuery.busy = false; // enable the UI

    //console.log("Done with query: " + runningQuery.query + ", " + runningQuery.status);
  }

  //
  // Query Monitoring Functions
  //

  function getMonitoringQuery(category) {
    var query1 = "select active_requests.*, meta().plan from system:active_requests";
    var query2 = "select completed_requests.*, meta().plan from system:completed_requests";
    var query3 = "select prepareds.* from system:prepareds";

    switch (category) {
      case 1: return query1;
      case 2: return query2;
      case 3: return query3;
    }
    return null;
  }

  // new style monitoring query using HttpClient
  function runMonitoringQuery() {
    var query = getMonitoringQuery(qwQueryService.getMonitoringSelectedTab());
    return(executeQueryUtilNew(query,false));
  }

  function processMonitoringQueryResults(response) {
    if (!response || response.status != 200)
      return;

    var data = JSON.parse(response.body);
    var status = response.status;
    var headers = response.headers;
    var config = response.config;
    var result = [];

    if (data.status == "success") {
      result = data.results;

      // we need to reformat the duration values coming back
      // since they are in the most useless format ever.

      for (var i = 0; i < result.length; i++) if (result[i].elapsedTime) {
        result[i].elapsedTime = qwQueryPlanService.convertTimeToNormalizedString(result[i].elapsedTime);
      }
    } else {
      result = [data.errors];
    }

    switch (qwQueryService.getMonitoringSelectedTab()) {
      case 1:
        qwQueryService.monitoring.active_requests = result;
        qwQueryService.monitoring.active_updated = new Date();
        break;
      case 2:
        qwQueryService.monitoring.completed_requests = result;
        qwQueryService.monitoring.completed_updated = new Date();
        break;
      case 3:
        qwQueryService.monitoring.prepareds = result;
        qwQueryService.monitoring.prepareds_updated = new Date();
        break;
    }
  }

  // get stats from the query service displayed on the monitoring page
  function getQueryServiceStats() {
    return qwHttp.do_request({
      url: "../_p/query/admin/vitals",
      method: "GET"
    });
  }

  // get stats from ns_server about queries, for display on the monitoring page
  function getQueryStats() {
    // which stats to retrieve?
    const statData = [
      {"step":60,"timeWindow":60,"start":-60,"metric":[{"label":"name","value":"n1ql_requests_250ms"}],"nodesAggregation":"sum","applyFunctions":["increase"]},
      {"step":60,"timeWindow":60,"start":-60,"metric":[{"label":"name","value":"n1ql_requests_500ms"}],"nodesAggregation":"sum","applyFunctions":["increase"]},
      {"step":60,"timeWindow":60,"start":-60,"metric":[{"label":"name","value":"n1ql_requests_1000ms"}],"nodesAggregation":"sum","applyFunctions":["increase"]},
      {"step":60,"timeWindow":60,"start":-60,"metric":[{"label":"name","value":"n1ql_requests_5000ms"}],"nodesAggregation":"sum","applyFunctions":["increase"]},
      //{"step":10,"timeWindow":360,"start":-10,"metric":[{"label":"name","value":"n1ql_requests"}],"applyFunctions":["irate"],"alignTimestamps":true},
      {"step":10,"timeWindow":360,"start":-10,"metric":[{"label":"name","value":"n1ql_avg_req_time"}],"alignTimestamps":true},
      {"step":10,"timeWindow":360,"start":-10,"metric":[{"label":"name","value":"n1ql_avg_svc_time"}],"alignTimestamps":true}
    ];

    return qwHttp.do_request( {
      url: "../pools/default/stats/range",
      method: "POST",
      data: statData
    });
  }

  // old style monitoring query using qwHttp/promises
  function updateQueryMonitoring() {
    var query = getMonitoringQuery(qwQueryService.getMonitoringSelectedTab());
    var result = [];

    //console.log("Got query: " + query);
//      var config = {headers: {'Content-Type':'application/json','ns-server-proxy-timeout':20000}};
    // console.log("Running monitoring cat: " + category + ", query: " + payload.statement);

    return (executeQueryUtil(query, false))
      .then(function success(response) {
          var data = response.data;
          var status = response.status;
          var headers = response.headers;
          var config = response.config;

          if (data.status == "success") {
            result = data.results;

            // we need to reformat the duration values coming back
            // since they are in the most useless format ever.

            for (var i = 0; i < result.length; i++) if (result[i].elapsedTime) {
              result[i].elapsedTime = qwQueryPlanService.convertTimeToNormalizedString(result[i].elapsedTime);
            }
          } else {
            result = [data.errors];
          }

          switch (qwQueryService.getMonitoringSelectedTab()) {
            case 1:
              qwQueryService.monitoring.active_requests = result;
              qwQueryService.monitoring.active_updated = new Date();
              break;
            case 2:
              qwQueryService.monitoring.completed_requests = result;
              qwQueryService.monitoring.completed_updated = new Date();
              break;
            case 3:
              qwQueryService.monitoring.prepareds = result;
              qwQueryService.monitoring.prepareds_updated = new Date();
              break;
          }


        },
        function error(response) {
          var data = response.data;
          var status = response.status;
          var headers = response.headers;
          var config = response.config;

          //console.log("Mon Error Data: " + JSON.stringify(data));
          //console.log("Mon Error Status: " + JSON.stringify(status));
          //console.log("Mon Error Headers: " + JSON.stringify(headers));
          //console.log("Mon Error Config: " + JSON.stringify(config));
          var error = "Error with query monitoring";

          if (data && data.errors)
            error = error + ": " + JSON.stringify(data.errors);
          else if (status && _.isString(data))
            error = error + ", query service returned status: " + status + ", " + data;
          else if (status)
            error = error + ", query service returned status: " + status;

          logWorkbenchError(error);
//        console.log("Got error: " + error);

          switch (category) {
            case 1:
              qwQueryService.monitoring.active_requests = [{statment: error}];
              qwQueryService.monitoring.active_updated = new Date();
              break;
            case 2:
              qwQueryService.monitoring.completed_requests = [{statement: error}];
              qwQueryService.monitoring.completed_updated = new Date();
              break;
            case 3:
              qwQueryService.monitoring.prepareds = [{statement: error}];
              qwQueryService.monitoring.prepareds_updated = new Date();
              break;
          }

        });
  };


  //
  // get the number of docs in each visible collection on the screen
  //
  function updateBucketCounts() {
    // build a query to get the doc count for each bucket that we know about
    //console.log("Updating bucket counts");

    qwQueryService.buckets.forEach(bucket => updateCountsForBucket(bucket));
  }

  function updateCountsForBucket(bucket) {
    var queryString = "select raw {";
    var collectionCount = 0;

    if (bucket.expanded) {
      bucket.collections.forEach(function (collection) {
        var scope = bucket.scopeArray.find(scope => scope.id == collection.scope);

        if (!collection.schema_error && ((bucket.scopeArray.length == 1) || scope && scope.expanded)) {
          if (collectionCount > 0) // second and subsequent buckets need a comma
            queryString += ',';

          collectionCount++;
          var collection_path = '`' + collection.bucket + '`.`' + collection.scope + '`.`' + collection.id + '`';
          queryString += '"' + collection_path + '" : (select raw count(*) from ' + collection_path + ')[0]';
        }
      });
    }

    queryString += '}';

    // run the query, extract the document counts
    if (collectionCount)
      executeQueryUtil(queryString, false)
        .then(function success(resp) {
            if (resp && resp.data && resp.data.results && resp.data.results.length)
              qwQueryService.buckets.forEach(function (bucket) {
                if (bucket.expanded) bucket.collections.forEach(function (collection) {
                  var collection_path = '`' + collection.bucket + '`.`' + collection.scope + '`.`' + collection.id + '`';
                  if (_.isNumber(resp.data.results[0][collection_path]))
                    collection.count = resp.data.results[0][collection_path];
                });
              });
          },
          function error(resp) {
            // we might get this if the user doesn't have permission to run queries
            // on the collection
            console.log("bucket count error: " + JSON.stringify(resp));
          });

  }

  //
  // whenever we refresh the list of buckets, refresh the scope and collection info
  //

  var needsQuotes = /.*[ `.-]/ig;

  function updateBucketsCallback() {
    // make sure we have a query node
    if (!qwMetadataService.valid())
      return;

    var bucketsToInfer = [];

    // clear the known buckets
    qwQueryService.buckets.length = 0;

    // for those buckets that are valid for querying, add them to the list
    qwMetadataService.bucketList.forEach(bucketName => {

      var bucket = qwQueryService.buckets.find(bucket => bucket.id == bucketName);
      // if we don't know about this bucket, add it
      if (!bucket) {
        bucket = {
          name: bucketName,
          id: bucketName,
          expanded: isExpanded(bucketName),
          schema: [],
          indexes: [],
          scopes: {},
          validated: true,
          scopeArray: [],
          //count: bucket_counts[bucketName],
          collections: []
        };
        qwQueryService.buckets.push(bucket);
        qwQueryService.bucket_names.push(bucket.id);
        if (!bucket.id.match(needsQuotes))
          addToken(bucket.id, "bucket");
        addToken('`' + bucket.id + '`', "bucket");
      }

      // if the bucket is expanded, or is the current query context, get the scopes and collections
      if (bucket.expanded || bucket.id == getCurrentResult().query_context_bucket) {
        if (qwMetadataService.compat.atLeast70)
          updateBucketMetadata(bucket);
        else {
          bucket.schema_error = "waiting for schema...";
          bucketsToInfer.push({bucket: bucket});
        }
      }
    });

    // for mixed clusters, infer bucket schemas directly
    if (!qwMetadataService.compat.atLeast70 && bucketsToInfer.length > 0)
      getCollectionsSchemasBackground(bucketsToInfer,0);

    refreshAutoCompleteArray();
  }

  //
  // make sure we have metadata when query context bucket changes
  //

  function query_context_bucket_changed() {
    var bucket = qwQueryService.buckets.find(bucket => bucket.id == qwQueryService.getCurrentResult().query_context_bucket);
    if (bucket)
      updateBucketMetadata(bucket)
        .then(() => {
          let scopeName = qwQueryService.getCurrentResult().query_context_scope;
          // make sure we have a valid scope if changing buckets
          if (!scopeName || !bucket.scopes[scopeName]) {
            let scopes = Object.keys(bucket.scopes);
            qwQueryService.getCurrentResult().query_context_scope = scopes.length ? scopes[0] : null;
          }
        });
    else
      qwQueryService.getCurrentResult().query_context_scope = "";
  }

  //
  // get the scopes and collections for the named bucket
  //

  function updateBucketMetadata(bucket) {
    var bucketName = bucket.name;
    // in mixed cluster mode, there are no scopes or collections
    if (!qwMetadataService.compat.atLast70 && bucket.schema.length == 0 && !bucket.schema_error)
      getSchemaForBucket(bucket);

    // for the bucket, get the scopes and collections
    return qwCollectionsService.refreshScopesAndCollectionsForBucket(bucketName).then(function (metadata) {

    var scopes = metadata.scopes[bucketName];
    bucket.scopes = {}; // reset scopes and collections to empty
    bucket.collections = [];
    if (scopes) scopes.forEach(function (scopeName) {
      if (!bucketName.match(needsQuotes) && !scopeName.match(needsQuotes)) {
        addToken(scopeName, "scope");
        addToken(bucketName + "." + scopeName, "scope");
      }
      addToken('`' + scopeName + '`', "scope");
      addToken('`' + bucketName + '`.`' + scopeName + '`', "scope");

      bucket.scopes[scopeName] = true;
      var colls = metadata.collections[bucketName][scopeName];
      // add the collection if it's not there already
      colls.forEach(collName => {
          if (!bucket.collections.find(coll => coll.id == collName && coll.scope == scopeName))
            bucket.collections.push({
              name: collName,
              id: collName,
              expanded: isExpanded(bucketName, scopeName, collName),
              bucket: bucketName,
              scope: scopeName,
              schema: [],
              indexes: [],
            });

          if (!bucketName.match(needsQuotes) && !scopeName.match(needsQuotes) && !collName.match(needsQuotes)) {
            addToken(collName, "collection");
            addToken(bucketName + "." + scopeName + "." + collName, "collection");
          }
          addToken('`' + collName + '`', "collection");
          addToken('`' + bucketName + '`.`' + scopeName + '`.`' + collName + '`', "collection");
        }
      );
    });

    // make an array of scope names and expansion status
    bucket.scopeArray = Object.keys(bucket.scopes)
      .map(function (scope_name) {
        return {id: scope_name, expanded: isExpanded(bucket.name, scope_name)};
      });
    bucket.collections.sort((c1, c2) => c1.name.localeCompare(c2.name));

    // if we are going to show schemas, we need to first get all the indexes, then get the schemas
    // (which will have the indexed fields marked)
    if (qwConstantsService.showSchemas) {
      updateBucketIndexes(bucket)
        .then(function success() {
          var collectionsToInfer = [];
          if (qwConstantsService.showSchemas)
            bucket.collections.forEach(collection => {
              if (collection.expanded && (collection.schema.length == 0 || collection.schema_error))
                collectionsToInfer.push({
                  bucket: bucket,
                  scope: bucket.scopeArray.find(scope => scope.id == collection.scope),
                  collection: collection
                });
            });

          // Should we go infer schemas for the expanded collections?
          if (collectionsToInfer.length)
            getCollectionsSchemasBackground(collectionsToInfer, 0);
        });

      refreshAutoCompleteArray();
    }

    });
  }

  //
  // get the indexes for the collections in a bucket
  //

  function updateBucketIndexes(bucket) {

    let queryText =
      'select indexes.* from system:indexes where state = "online" and bucket_id = "' + bucket.name +
      '" or (bucket_id is missing and keyspace_id = "' + bucket.name + '")';

    return executeQueryUtil(queryText, false)
      .then(function (resp) {
          var data = resp.data, status = resp.status;

          //console.log("Got index info: " + JSON.stringify(data));

          if (data && _.isArray(data.results)) {
            qwQueryService.indexes = data.results;
            // make sure each bucket knows about each relevant index
            for (var i = 0; i < data.results.length; i++) {
              var index = data.results[i];
              // if the index doesn't have a bucket_id, it's on the _default scope/collection
              if (!index.bucket_id) {
                index.bucket_id = index.keyspace_id;
                index.scope_id = "_default";
                index.keyspace_id = "_default";
              }
              //console.log("Got index: "+ JSON.stringify(index));

              addToken(data.results[i].name, 'index');

              // add the index to the named collection
              var collection = bucket.collections.find(c=> c.name == index.keyspace_id && c.scope == index.scope_id);
              if (collection)
                collection.indexes.push(index);
            }
          }

          refreshAutoCompleteArray();
        },

        // error status from query about indexes
        function index_error(resp) {
          var data = resp.data, status = resp.status;

          var error = "Error retrieving list of indexes";

          if (data && data.errors)
            error = error + ": " + data.errors;
          if (status)
            error = error + ", contacting query service returned status: " + status;
//          if (response && response.statusText)
//          error = error + ", " + response.statusText;

//            console.log(error);
          logWorkbenchError(error);

          qwQueryService.index_error = error;
        }
      );

  }

  //
  // record the current state of expanded buckets, scopes, and collections
  //

  function updateExpandedState() {
    var exp = {};
    qwQueryService.buckets.forEach(function (bucket) {
      if (bucket.expanded)
        exp[bucket.name] = true;
      bucket.scopeArray.forEach(function (scope) {
        if (scope.expanded)
          exp[bucket.name + '.' + scope.id] = true;
      });
      bucket.collections.forEach(function (collection) {
        if (collection.expanded)
          exp[bucket.name + '.' + collection.scope + '.' + collection.id] = true;
      });
    });

    //console.log("Got expanded state: " + JSON.stringify(exp,null,2));
    qwQueryService.options.expanded = exp;
    saveStateToStorage();
  }

  function isExpanded(bucket, scope, collection) {
    var key = bucket;
    if (scope) key += '.' + scope;
    if (collection) key += '.' + collection;

    return qwQueryService.options.expanded[key];
  }

  //
  // this method uses promises and recursion to get the schemas for a list of
  // collections in sequential order, waiting and pausing before moving on to the next.
  //

  function getCollectionsSchemasBackground(collectionList, currentIndex, countsOnly) {
    // if we've run out of buckets, nothing more to do except get the bucket counts
    if (currentIndex < 0 || currentIndex >= collectionList.length) {
      updateBucketCounts();
      return;
    }

    getSchemaForBucket(collectionList[currentIndex].bucket,
      collectionList[currentIndex].scope,
      collectionList[currentIndex].collection) // get the schema, pause, then get the next one
      .then(function successCallback(response) {
        setTimeout(function () {
          getCollectionsSchemasBackground(collectionList, currentIndex + 1);
        }, 500);
      }, function errorCallback(response) {
        setTimeout(function () {
          getCollectionsSchemasBackground(collectionsList, currentIndex + 1);
        }, 500);
      });
  }

  //
  // Get a schema for a given, named bucket.
  //

  function getSchemaForBucket(bucket, scope, collection) {

    var dest = bucket; // where do we put the schema and/or errors
    var name = '`' + bucket.id + '`';
    if (scope) {
      name += '.`' + scope.id + '`.`' + collection.id + '`';
      dest = collection;
    }

    //console.log("Getting schema for : " + name);

    return executeQueryUtil('infer ' + name + '  with {"infer_timeout":5, "max_schema_MB":1};', false)
      .then(function successCallback(response) {
        //console.log("Done with schema for: " + bucket.id);
        //console.log("Schema status: " + response.status);
        //console.log("Schema data: " + JSON.stringify(response.data));

        dest.schema_error = null;

        if (_.isArray(response.data.warnings) && response.data.warnings.length > 0)
          dest.schema_error = response.data.warnings[0].msg;

        dest.schema.length = 0;

        if (!response || !response.data)
          dest.schema_error = "Empty or invalid server response: ";
        else if (response.data.errors) {
          dest.schema_error = "Infer error: ";
          if (_.isString(response.data.errors))
            dest.schema_error += response.data.errors;
          else if (_.isArray(response.data.errors)) {
            response.data.errors.forEach(function (val) {
              if (val.msg) dest.schema_error += val.msg + ' ';
              else dest.schema_error += JSON.stringify(val) + ' ';
            });
          } else
            dest.schema_error += JSON.stringify(response.data.errors);
        } else if (response.data.status == "stopped") {
          dest.schema_error = "Infer error, query stopped on server.";
        } else if (response.data.status != "success") {
          dest.schema_error = "Infer error: " + response.data.status;
        } else if (_.isString(response.data.results))
          dest.schema_error = response.data.results;
        else {
          //console.log("Got schema: " + JSON.stringify(response.data.results));
          dest.schema = response.data.results[0];

          var totalDocCount = 0;
          for (var i = 0; i < dest.schema.length; i++)
            totalDocCount += dest.schema[i]['#docs'];

          getFieldNamesFromSchema(dest.schema, "");
          getFieldNamesFromSchema(dest.schema, dest.name);
          truncateSchema(dest.schema);
          refreshAutoCompleteArray();

          //console.log("for bucket: " + dest.id + " got " + dest.schema.length + " flavars, doc count: " + totalDocCount);
          dest.totalDocCount = totalDocCount;

          for (var i = 0; i < dest.schema.length; i++)
            dest.schema[i]['%docs'] = (dest.schema[i]['#docs'] / totalDocCount * 100);

          // we have an array of columns that are indexed. Let's mark the individual
          // fields, now that we have a schema.
          dest.indexed_fields = {};

          // each index has an "index_key" array of fields that are used in the index
          dest.indexes.forEach(function (index) {
            index.index_key.forEach(function (field) {
              // if it starts with back ticks, it's a single field name
              if (field.startsWith('`'))
                dest.indexed_fields[field] = true;
              // if it starts with open paren, it's a path
              else if (field.startsWith('(')) {
                field = field.replace(/\(/g,'').replace(/\)/g,'');
                dest.indexed_fields[field] = true;
              }
              // otherwise it's an array expression, how to handle?
            })
          });

          for (var flavor = 0; flavor < dest.schema.length; flavor++) { // iterate over flavors
            markIndexedFields(dest.indexed_fields, dest.schema[flavor], "");
            dest.schema[flavor].hasFields =
              (dest.schema[flavor].properties && Object.keys(dest.schema[flavor].properties).length > 0) ||
              dest.schema[flavor].type;
          }

          //if (dest.schema.length)
          //  dest.schema.unshift({Summary: "Summary: " + dest.schema.length + " flavors found, sample size "+ totalDocCount + " documents",
          //    hasFields: true});
        }

      }, function errorCallback(response) {
        var error = "Error getting schema for bucket: " + dest.id;
        if (response)
          if (response.data && response.data.errors) {
            error += ", " + JSON.stringify(response.data.errors, null, '  ');
          } else if (response.status) {
            error += ", " + response.status;
            if (response.statusText)
              error += " " + response.statusText;
          } else
            error += JSON.stringify(response);

        dest.schema_error = error;
      });

  };

  //
  // When we get the schema, we need to mark the indexed fields. We start at the top
  // level, but recursively traverse any subtypes, keeping track of the path that we
  // followed to get to the subtype.
  //

  function markIndexedFields(fieldMap, schema, path) {
    //console.log("marking schema size: "+schema.fields.length + " with path: " + path);

    _.forEach(schema['properties'], function (theField, field_name) {
      // in the list of indexed fields, the field names are quoted with back quotes
      var quoted_field_name = '`' + field_name + '`';
      if (path.length > 0)
        quoted_field_name = path + quoted_field_name;

      //console.log(" checking field: " + quoted_field_name);

      // are we in the index map?
      if (fieldMap[quoted_field_name]) {
        theField.indexed = true;
      }

      // do we have a subtype to traverse?
      if (theField.properties)
        markIndexedFields(fieldMap, theField, path + '`' + field_name + '`.');
    });
  }

  //
  // show an error dialog
  //

  function showErrorDialog(message, details_array) {
    qwDialogService.showErrorDialog("Error", message, details_array, true);
  }

  function showWarningDialog(message, details_array) {
    qwDialogService.showErrorDialog("Warning", message, details_array, true);
  }

  //
  // Functions for dealing with User-Defined Functions (UDFs)
  //

  function updateUDFs() {
    return executeQueryUtil("select functions.* from system:functions", false)
      .then(function success(resp) {
          qwQueryService.udfs.length = 0;
          if (resp.data && resp.data.results)
            resp.data.results.forEach(udf => qwQueryService.udfs.push(udf));
        },

        // sanity check - if there was an error put a message in the console.
        function error(resp) {
          qwQueryService.udfs.length = 0;
          console.log("Error getting UDFs: " + JSON.stringify(resp));
        });
  }

  function updateUDFlibs() {
    if (!qwMetadataService.isEnterprise()) // no libraries in CE
      return;
    var userAgent = 'Couchbase Query Workbench';
    return qwHttp.do({
      url: "../_p/query/evaluator/v1/libraries/",
      headers: {
        'Content-Type': 'application/json', 'ns-server-proxy-timeout':
          (qwQueryService.options.query_timeout + 1) * 1000,
        'ignore-401': 'true', 'CB-User-Agent': userAgent, 'isNotForm': 'true'
      },
      method: "GET"
    })
      .then(function success(resp) {
          qwQueryService.udfLibs.length = 0;
          if (_.isArray(resp.data)) resp.data.forEach(lib =>
              qwQueryService.udfLibs.push({name: lib.name, content: lib.code, bucket: lib.bucket, scope: lib.scope}));
        },

        // sanity check - if there was an error put a message in the console.
        function error(resp) {
          qwQueryService.udfLibs.length = 0;
          console.log("Error getting UDF Libs: " + JSON.stringify(resp));
        });
  }

  function newUDFlib(name, contents, bucket, scope) {
    if (!qwMetadataService.isEnterprise()) // no libraries in CE
      return;
    var userAgent = 'Couchbase Query Workbench';
    let url = "../_p/query/evaluator/v1/libraries/" + encodeURIComponent(name);
    if (bucket && scope && bucket.length && scope.length)
      url = url + '?bucket=' + encodeURIComponent(bucket) + '&scope=' + encodeURIComponent(scope);
    return qwHttp.do({
      url: url,
      headers: {
        'Content-Type': 'application/json', 'ns-server-proxy-timeout':
          (qwQueryService.options.query_timeout + 1) * 1000,
        'ignore-401': 'true', 'CB-User-Agent': userAgent, 'isNotForm': 'true'
      },
      data: contents,
      method: "POST",
    });
  }

  function dropUDFlib(lib) {
    if (!qwMetadataService.isEnterprise()) // no libraries in CE
      return;
    var userAgent = 'Couchbase Query Workbench';
    let url = "../_p/query/evaluator/v1/libraries/" + encodeURIComponent(lib.name);
    if (lib.bucket && lib.scope && lib.bucket.length && lib.scope.length)
      url = url + '?bucket=' + encodeURIComponent(lib.bucket) + '&scope=' + encodeURIComponent(lib.scope);
    return qwHttp.do({
      url: url,
      headers: {
        'Content-Type': 'plain/text','ns-server-proxy-timeout': (qwQueryService.options.query_timeout + 1) * 1000,
        'ignore-401': 'true', 'CB-User-Agent': userAgent, 'isNotForm': 'true'
      },
      method: "DELETE",
    });
  }

  //
  // get the query history
  //

  loadStateFromStorage();

  //
  // when we are initialized, get the list of buckets
  //

  //setTimeout(updateBuckets, 500);

  return qwQueryService;
}
