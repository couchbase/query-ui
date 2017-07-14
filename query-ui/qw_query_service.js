(function() {

  angular.module('qwQuery').factory('qwQueryService', getQwQueryService);

  getQwQueryService.$inject = ['$rootScope','$q', '$uibModal', '$timeout', '$http', 'mnPendingQueryKeeper', 'validateQueryService', '$httpParamSerializer','qwConstantsService','qwQueryPlanService','mnPoolDefault','mnPools','mnAuthService', 'mnServersService'];

  function getQwQueryService($rootScope, $q, $uibModal, $timeout, $http, mnPendingQueryKeeper, validateQueryService, $httpParamSerializer,qwConstantsService,qwQueryPlanService,mnPoolDefault,mnPools,mnAuthService,mnServersService) {

    var qwQueryService = {};

    //
    // remember which tab is selected for output style: JSON, table, or tree
    //

    qwQueryService.outputTab = 1;     // remember selected output tab
    qwQueryService.selectTab = function(newTab) {qwQueryService.outputTab = newTab;};
    qwQueryService.isSelected = function(checkTab) {return qwQueryService.outputTab === checkTab;};


    qwQueryService.monitoringTab = 0;
    qwQueryService.monitoringAutoUpdate = true;
    qwQueryService.selectMonitoringTab = function(newTab) {qwQueryService.monitoringTab = newTab;};
    qwQueryService.isMonitoringSelected = function(checkTab) {return qwQueryService.monitoringTab === checkTab;};

    // access to our most recent query result, and functions to traverse the history
    // of different results

    qwQueryService.getResult = function() {return lastResult;};
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

    qwQueryService.canCreateBlankQuery = canCreateBlankQuery;

    qwQueryService.getPastQueries = function() {return(pastQueries);}
    qwQueryService.getQueryHistoryLength = function() {return(pastQueries.length);}

    qwQueryService.emptyResult = emptyResult;

    //
    // keep track of the bucket and field names we have seen, for use in autocompletion
    //

    qwQueryService.autoCompleteTokens = {}; // keep a map, name and kind
    qwQueryService.autoCompleteArray = [];  // array for use with Ace Editor

    // execute queries, and keep track of when we are busy doing so

    qwQueryService.executingQuery = {busy: false};
    qwQueryService.currentQueryRequest = null;
    qwQueryService.currentQueryRequestID = null;
    qwQueryService.executeQuery = executeQuery;
    qwQueryService.cancelQuery = cancelQuery;
    qwQueryService.cancelQueryById = cancelQueryById;

    qwQueryService.executeQueryUtil = executeQueryUtil;

    qwQueryService.saveStateToStorage = saveStateToStorage;

    // update store the metadata about buckets

    qwQueryService.buckets = [];
    qwQueryService.bucket_names = [];
    qwQueryService.indexes = [];
    qwQueryService.updateBuckets = updateBuckets;             // get list of buckets
    qwQueryService.updateBucketCounts = updateBucketCounts;   // get list of buckets
    qwQueryService.getSchemaForBucket = getSchemaForBucket;   // get schema
    qwQueryService.testAuth = testAuth; // check passward

//    mnAuthService.whoami().then(function (resp) {
//      if (resp) qwQueryService.user = resp;
//    });


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

    // for the front-end, distinguish error status and good statuses

    qwQueryService.status_success = status_success;
    qwQueryService.status_fail = status_fail;

    function status_success() {return(lastResult.status == 'success');}
    function status_fail()
    {return(lastResult.status == '400' ||
        lastResult.status == 'errors' ||
        lastResult.status == '500' ||
        lastResult.status == '404' ||
        lastResult.status == 'stopped');}

    //
    // here are some options we use while querying
    //

    qwQueryService.options = {
        timings: true,
        max_parallelism: "",
        scan_consistency: "not_bounded",
        positional_parameters: [],
        named_parameters: [],
        query_timeout: 600
    };

    // clone options so we can have a scratch copy for the dialog box
    qwQueryService.clone_options = function() {
        return {
          timings: qwQueryService.options.timings,
          max_parallelism: qwQueryService.options.max_parallelism,
          scan_consistency: qwQueryService.options.scan_consistency,
          positional_parameters: qwQueryService.options.positional_parameters.slice(),
          named_parameters: qwQueryService.options.named_parameters.slice(),
          query_timeout: qwQueryService.options.query_timeout
        };
    };

    //
    // a few variables for keeping track of the doc editor
    //

    qwQueryService.doc_editor_options = {
        selected_bucket: null,
        query_busy: false,
        limit: 10,
        offset: 0,
        where_clause: '',
        current_query: '',
        current_bucket: '',
        current_result: []
    };

    //
    // this structure holds the current query text, the current query result,
    // and defines the object for holding the query history
    //

    function QueryResult(status,elapsedTime,executionTime,resultCount,resultSize,result,
        data,query,requestID,explainResult,mutationCount) {
      this.status = status;
      this.resultCount = resultCount;
      this.resultCount = mutationCount;
      this.resultSize = resultSize;
      this.result = result;
      this.data = data;
      this.query = query;
      this.requestID = requestID;
      this.explainResult = explainResult;
      if (explainResult)
        this.explainResultText = JSON.stringify(explainResult,null,'  ');
      else
        this.explainResultText = "";

      this.elapsedTime = truncateTime(elapsedTime);
      this.executionTime = truncateTime(executionTime);
    };


    // elapsed and execution time come back with ridiculous amounts of
    // precision, and some letters at the end indicating units.

    function truncateTime(timeStr)
    {
      var timeEx = /([0-9.]+)([a-z]+)/i; // number + time unit string

      if (timeStr && timeEx.test(timeStr)) {
        var parts = timeEx.exec(timeStr);
        var num = Number(parts[1]).toFixed(2); // truncate number part
        if (!isNaN(num))
          return(num + parts[2]);
      }

      return(timeStr); // couldn't match, just return orig value
    }


    QueryResult.prototype.clone = function()
    {
      return new QueryResult(this.status,this.elapsedTime,this.executionTime,this.resultCount,
          this.resultSize,this.result,this.data,this.query,this.requestID,this.explainResult,this.mutationCount);
    };
    QueryResult.prototype.copyIn = function(other)
    {
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
    };


    //
    // structures for remembering queries and results
    //

    var dummyResult = new QueryResult('','','','','','',{},'');
    var lastResult = dummyResult.clone();
    var savedResultTemplate = dummyResult.clone();
    savedResultTemplate.status = "cached query";
    savedResultTemplate.result = '{"data_not_cached": "Hit execute to rerun query"}';
    savedResultTemplate.data = {data_not_cached: "Hit execute to rerun query"};
    savedResultTemplate.explainResult = savedResultTemplate.data;
    savedResultTemplate.explainResultText = savedResultTemplate.result;

    var newQueryTemplate = dummyResult.clone();
    newQueryTemplate.status = "Not yet run";
    newQueryTemplate.result = '{"no_data_yet": "Hit execute to run query"}';
    newQueryTemplate.data = {no_data_yet: "Hit execute to run query"};

    var executingQueryTemplate = dummyResult.clone();
    executingQueryTemplate.status = "Executing";
    executingQueryTemplate.result = '{"status": "Executing statement"}';
    executingQueryTemplate.data = {status: "Executing statement"};
    executingQueryTemplate.resultSize = 0;
    executingQueryTemplate.resultCount = 0;


    var pastQueries = [];       // keep a history of past queries and their results
    var currentQueryIndex = 0;  // where in the array are we? we start past the
                                // end of the array, since there's no history yet

    function emptyResult() {
        return(!pastQueries[currentQueryIndex] ||
            pastQueries[currentQueryIndex].result === savedResultTemplate.result);
    }

    //
    // where are we w.r.t. the query history?
    //

    function getCurrentIndex() {
      return (currentQueryIndex+1) + "/" + (pastQueries.length == 0 ? 1 : pastQueries.length);
    }

    function getCurrentIndexNumber() {
      return (currentQueryIndex);
    }

    function setCurrentIndex(index) {
      if (index < 0 || index >= pastQueries.length)
        return;

      currentQueryIndex = index;

      $timeout(function(){
        lastResult.copyIn(pastQueries[currentQueryIndex]);
        currentQuery = lastResult.query;
      },50);
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
        //console.log("Got saved state: " + JSON.stringify(savedState));
        if (savedState.lastResult) {
          //console.log("Got last result: " + JSON.stringify(savedState.lastResult));
          lastResult.copyIn(savedState.lastResult);
          currentQueryIndex = savedState.currentQueryIndex;
          pastQueries = savedState.pastQueries;
          qwQueryService.outputTab = savedState.outputTab;
          if (savedState.options)
            qwQueryService.options = savedState.options;
          if (savedState.doc_editor_options) {
            qwQueryService.doc_editor_options = savedState.doc_editor_options;
          }
        }
        else
          console.log("No last result");
      } catch (err) {console.log("Error loading state: " + err);}
    }


    function saveStateToStorage() {
      // nop if we don't have local storage
      if (!hasLocalStorage)
        return;

      // create a structure to hold the current state. To save state we will only
      // save queries, and not their results (which might well exceed the 5MB
      // we have available

      var savedState = {};
      savedState.pastQueries = [];
      savedState.outputTab = qwQueryService.outputTab;
      savedState.currentQueryIndex = currentQueryIndex;
      savedState.lastResult = savedResultTemplate.clone();
      savedState.lastResult.query = lastResult.query;
      savedState.options = qwQueryService.options;

      savedState.doc_editor_options = {
          selected_bucket: qwQueryService.doc_editor_options.selected_bucket,
          query_busy: false,
          limit: qwQueryService.doc_editor_options.limit,
          offset: qwQueryService.doc_editor_options.offset,
          where_clause: qwQueryService.doc_editor_options.where_clause,
          current_query: '',
          current_bucket: qwQueryService.doc_editor_options.current_bucket,
          current_result: [] // don't want to save the results - they could be big
      };

      _.forEach(pastQueries,function(queryRes,index) {
        var qcopy = savedResultTemplate.clone();
        qcopy.query = queryRes.query;
        savedState.pastQueries.push(qcopy);
      });

      //console.log("saving state, len: " + JSON.stringify(savedState).length);

      // there is no cross browser means to determine how much local
      // storage space is available. When we get an exception, warn the user
      // and let them figure out what to do
      try {
        localStorage[localStorageKey] = JSON.stringify(savedState);
      } catch (e) {
        // if the save failed, notify the user
        showWarningDialog("Warning: Unable to save query history, browser local storage exhausted. You can still run queries, but they won't be saved for future sessions. Try removing large queries from history.")
      }
      //
      //console.log("Saving state to storage: " + JSON.stringify(savedState));
    }

    //
    // functions for adding new tokens and refreshing the token array
    //

    function addToken(token, type) {
      // see if the token needs to be quoted
      if (token.indexOf(' ') >= 0 || token.indexOf('-') >= 0)
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
            {caption:key,snippet:key,meta:qwQueryService.autoCompleteTokens[key]});
      }
    };


    //
    // go over a schema and recursively put all the field names in our name map
    //

    function getFieldNamesFromSchema(schema,prefix) {
      //console.log("Got schema: " + JSON.stringify(schema, null, 4));
      for (var i=0; i< schema.length; i++)
        _.forEach(schema[i]['properties'], function(field, field_name) {
          //console.log("Adding field: " + prefix + field_name);
          //console.log("  field[properties]: " + field['properties']);
          //console.log("  field[items]: " + field['items']);
          //if (field['items'])
          // console.log("    field[items].subtype: " + field['items'].subtype);

          addToken(prefix + field_name,"field");
          // if the field has sub-properties, make a recursive call
          if (field['properties']) {
            getFieldNamesFromSchema([field],prefix + field_name + ".");
          }

          // if the field has 'items', it is an array, make recursive call with array type
          if (field['items'] && field['items'].subtype) {
            getFieldNamesFromSchema([field['items'].subtype],prefix + field_name + "[0].");
          }

          else if (_.isArray(field['items'])) for (var i=0;i<field['items'].length;i++)
            if (field['items'][i].subtype) {
              getFieldNamesFromSchema([field['items'][i].subtype],prefix + field_name + "[0].");
            }
        });
    }

    //
    // for error checking, it would be nice highlight when a specified field is not found
    // in a given schema
    //

    function isFieldNameInSchema(schema,fieldName) {
      // all schemas have the name "*"
      if (fieldName == "*")
        return true;
      // the field name might be a plain string, it might be suffixed with "[]", and it might
      // have a subfield expression starting with a "."
      var firstDot = fieldName.indexOf(".");
      var fieldPrefix = fieldName.substring(0,(firstDot >= 0 ? firstDot : fieldName.length));
      var fieldSuffix = (firstDot >= 0 ? fieldName.substring(firstDot+1) : "");
      var arrayIndex = fieldPrefix.indexOf("[");
      if (arrayIndex >= 0)
        fieldPrefix = fieldPrefix.substring(0,fieldPrefix.indexOf("["));

      //console.log("fieldPrefix: *" + fieldPrefix + "* suffix: *" + fieldSuffix + "*");

      for (var i=0; i< schema.length; i++) // for each flavor
        for (var field_name in schema[i]['properties']) {
          if (field_name == fieldPrefix) { // found a possible match
            if (fieldSuffix.length == 0)  // no subfields? we're done, yay!
              return true;

            var field = schema[i]['properties'][field_name];
            // if we had an array expr, check subfields against the array schema
            if (arrayIndex > -1 && field['items'] && field['items'].subtype &&
                isFieldNameInSchema([field['items'].subtype],fieldSuffix))
              return true;

            // if we have a non-array, check the subschema
            if (arrayIndex == -1 && field['properties'] &&
                isFieldNameInSchema([field],fieldSuffix))
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
      return (currentQueryIndex == pastQueries.length -1 &&
          lastResult.query.trim() === pastQueries[pastQueries.length-1].query.trim() &&
          lastResult.status != newQueryTemplate.status &&
          !qwQueryService.executingQuery.busy);
    }
    function hasPrevResult() {return currentQueryIndex > 0;}

    // we can go forward if we're back in the history, or if we are at the end and
    // want to create a blank history element
    function hasNextResult() {
      return (currentQueryIndex < pastQueries.length-1) ||
      canCreateBlankQuery();
    }

    function prevResult()
    {
      if (currentQueryIndex > 0) // can't go earlier than the 1st
      {
        // if we are going backward from the end of the line, from a query that
        // has been edited but hasn't been run yet, we need to add it to the
        // history

        if (currentQueryIndex === (pastQueries.length-1) &&
            lastResult.query.trim() !== pastQueries[pastQueries.length-1].query.trim()) {
          var newResult = newQueryTemplate.clone();
          newResult.query = lastResult.query;
          pastQueries.push(newResult);
          currentQueryIndex++;
        }

        //
        // the following gross hack is due to an angular issue where it doesn't
        // successfully detect *some* changes in the result data, and thus doesn't
        // update the table. So we set the result to blank, then back to a value
        // after a certain delay.
        //

        lastResult.result = tempResult; // blank values
        lastResult.data = tempData;
        currentQueryIndex--;

        $timeout(function(){
          lastResult.copyIn(pastQueries[currentQueryIndex]);
          currentQuery = lastResult.query;
        },50);
      }
    }

    function nextResult()
    {
      if (currentQueryIndex < pastQueries.length -1) // can we go forward?
      {

        //
        // see comment above about the delay hack.
        //

        lastResult.result = tempResult; // blank values
        lastResult.data = tempData;
        currentQueryIndex++;

        $timeout(function(){
          lastResult.copyIn(pastQueries[currentQueryIndex]);
          currentQuery = lastResult.query;
        },50);
      }

      // if the end query has been run, and is unedited, create a blank query
      else if (canCreateBlankQuery()) {
        addNewQueryAtEndOfHistory();
      }
    }

    function addNewQueryAtEndOfHistory(query) {
      // if the end of the history is a blank query, add it there.

      if (pastQueries.length > 0 && pastQueries[pastQueries.length -1].query.length == 0) {
        pastQueries[pastQueries.length -1].query = query;
      }

      // otherwise, add a new query at the end of history

      else {
        var newResult = newQueryTemplate.clone();
        if (query)
          newResult.query  = query;
        else
          newResult.query = "";
        pastQueries.push(newResult);
      }

      currentQueryIndex = pastQueries.length - 1;
      lastResult.copyIn(pastQueries[currentQueryIndex]);
    }

    //
    // clear the entire query history
    //

    function clearHistory() {
      // don't clear the history if existing queries are already running
      if (qwQueryService.executingQuery.busy)
        return;

      lastResult.copyIn(dummyResult);
      pastQueries.length = 0;
      currentQueryIndex = 0;

      saveStateToStorage(); // save current history
    }

    //
    // clear the current query
    //

    function clearCurrentQuery() {
      // don't clear the history if existing queries are already running
      if (qwQueryService.executingQuery.busy || pastQueries.length == 0)
        return;

      pastQueries.splice(currentQueryIndex,1);
      if (currentQueryIndex >= pastQueries.length)
        currentQueryIndex = pastQueries.length - 1;

      lastResult.copyIn(pastQueries[currentQueryIndex]);

      saveStateToStorage(); // save current history
    }

    /**
     * Fast UUID generator, RFC4122 version 4 compliant.
     * @author Jeff Ward (jcward.com).
     * @license MIT license
     * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
     **/
    var UUID = (function() {
      var self = {};
      var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
      self.generate = function() {
        var d0 = Math.random()*0xffffffff|0;
        var d1 = Math.random()*0xffffffff|0;
        var d2 = Math.random()*0xffffffff|0;
        var d3 = Math.random()*0xffffffff|0;
        return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
        lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
        lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
        lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
      }
      return self;
    })();

    //
    // cancelQuery - if a query is running, cancel it
    //

    function cancelQuery() {
//      console.log("Cancelling query, currentQuery: " + qwQueryService.currentQueryRequest);
      if (qwQueryService.currentQueryRequest != null) {
        var queryInFly = mnPendingQueryKeeper.getQueryInFly(qwQueryService.currentQueryRequest);
        queryInFly && queryInFly.canceler("test");

        //
        // also submit a new query to delete the running query on the server
        //

        var query = 'delete from system:active_requests where clientContextID = "' +
          qwQueryService.currentQueryRequestID + '";';

//        console.log("  queryInFly: " + queryInFly + "\n  query: " + query);

        executeQueryUtil(query,false)

        .then(function success() {
//        console.log("Success cancelling query.");
//        console.log("    Data: " + JSON.stringify(data));
//        console.log("    Status: " + JSON.stringify(status));
        },

        // sanity check - if there was an error put a message in the console.
        function error(resp) {
//          var data = resp.data, status = resp.status;
          logWorkbenchError("Error cancelling query: " + JSON.stringify(resp));
//          console.log("Error cancelling query.");
//          console.log("    Data: " + JSON.stringify(data));
//          console.log("    Status: " + JSON.stringify(status));
        });

      }
    }


    //
    // query monitoring might want to cancel queries this way

    function cancelQueryById(requestId) {
      //console.log("Cancelling query: " + requestId);
      var query = 'delete from system:active_requests where requestId = "' +
        requestId + '";';

      executeQueryUtil(query,false)

        .then(function success() {
//        console.log("Success cancelling query.");
//        console.log("    Data: " + JSON.stringify(data));
//        console.log("    Status: " + JSON.stringify(status));
        },

      // sanity check - if there was an error put a message in the console.
      function error(resp) {
          logWorkbenchError("Error cancelling query: " + JSON.stringify(resp));
//        var data = resp.data, status = resp.status;
//        console.log("Error cancelling query: " + query);
//        console.log("    Response: " + JSON.stringify(resp));
//        console.log("    Status: " + JSON.stringify(status));
      });
    }

    //
    // we run queries many places, the following function calls $http to run
    // the query, and returns the promise so the caller can handle success/failure callbacks.
    // queryText - the query to run
    // is_user_query - with user queries, we need to
    //   1) set a client_context_id to allow the query to be cancelled
    //   2) transform responses to handle ints > 53 bits long?
    //   3) set qwQueryService.currentQueryRequestID and qwQueryRequest.currentQueryRequest
    //

    function executeQueryUtil(queryText, is_user_query) {
      //console.log("Running query: " + queryText);
      var request = buildQueryRequest(queryText,is_user_query);

      // if the request can't be built because the query is too big, return a dummy
      // promise that resolves immediately. This needs to follow the angular $http
      // promise, which supports .success and .error as well as .then

      if (!request) {
        var dummy = Promise.resolve({errors: "Query too long"});
        //dummy.success = function(fn) {/*nop*/ return(dummy);};
        //dummy.error = function(fn) {dummy.then(fn); return(dummy);};
        dummy.origThen = dummy.then;
        dummy.then = function(fn1,fn2) {dummy.origThen(fn1,fn2); return(dummy);};
        return(dummy);
      }

      return($http(request));
    }

    function logWorkbenchError(errorText) {
      $http({
          url: "/logClientError",
          method: "POST",
          data: errorText,
      });
    }

    function buildQueryRequest(queryText, is_user_query, queryOptions) {

      //console.log("Building query: " + queryText);
      //
      // create a data structure for holding the query, and the credentials for any SASL
      // protected buckets
      //

      var queryData = {statement: queryText, pretty: true};

      if (qwConstantsService.sendCreds) {
        var credArray = [];

        if (!qwQueryService.bucket_errors) for (var i = 0; i < qwQueryService.buckets.length; i++) {
          var pw = qwQueryService.buckets[i].password ? qwQueryService.buckets[i].password : "";
          credArray.push({user:"local:"+qwQueryService.buckets[i].id,pass: pw });
        }

        if (credArray.length > 0) {
          queryData.creds = credArray;
        }
      }
      //console.log("Creds was: " + JSON.stringify(queryData.creds));

      // are there options we need to add to the query request?

      if (queryOptions) {
        if (queryOptions.timings && mnPoolDefault.export.compat &&
            mnPoolDefault.export.compat.atLeast50) // keep track of timings for each op?
          queryData.profile = "timings";

        if (queryOptions.max_parallelism && queryOptions.max_parallelism.length > 0)
          queryData.max_parallelism = queryOptions.max_parallelism;

        if (queryOptions.scan_consistency)
          queryData.scan_consistency = queryOptions.scan_consistency;

        if (queryOptions.positional_parameters && queryOptions.positional_parameters.length > 0)
          queryData.args = queryOptions.positional_parameters;

        if (queryOptions.named_parameters)
          for (var i=0; i < queryOptions.named_parameters.length; i++)
            queryData[queryOptions.named_parameters[i].name] = queryOptions.named_parameters[i].value;

        //console.log("Running query: " + JSON.stringify(queryData));
      }

      // if the user might want to cancel it, give it an ID

      if (is_user_query) {
        qwQueryService.currentQueryRequestID = UUID.generate();
        queryData.client_context_id = qwQueryService.currentQueryRequestID;
      }

      //
      // build the query request appropriately for the server version. 4.5 and later
      // work with JSON encoding, 4.1 requires URL encoding
      //

      var queryRequest;
      var userAgent = 'Couchbase Query Workbench';
      if (mnPoolDefault.export.thisNode && mnPoolDefault.export.thisNode.version)
        userAgent += ' (' + mnPoolDefault.export.thisNode.version + ')';

      if (!_.isNumber(qwQueryService.options.query_timeout) ||
          qwQueryService.options.query_timeout == 0)
          qwQueryService.options.query_timeout = 600;

      if (mnPoolDefault.export.compat && mnPoolDefault.export.compat.atLeast45) {

        // An alternate way to get around Angular's encoding is "isNotForm: true". But
        // that triggers bug MB-16964, where the server currently fails to parse creds
        // when they are JSON encoded.
        // MB-16964 is fixed as of 4.5, so for that version we'll send queries this
        // way and avoid URL encoding

        //console.log("JSON Encoding Query");
        var queryRequest = {
            url: qwConstantsService.queryURL,
            method: "POST",
            headers: {'Content-Type':'application/json','ns-server-proxy-timeout':qwQueryService.options.query_timeout*1000,
                      'ignore-401':'true','CB-User-Agent': userAgent},
            data: queryData,
            mnHttp: {
              isNotForm: true,
              group: "global"
            }
        };
      }

      // Because Angular automatically urlencodes JSON parameters, but has a special
      // algorithm that doesn't encode semicolons, any semicolons inside the query
      // will get mis-parsed by the server as the end of the parameter (see MB-18621
      // for an example). To bypass this, we will url-encode ahead of time, and then
      // make sure the semicolons get urlencoded as well.

      else {
        //console.log("URL Encoding Query");
        if (queryData.creds)
          queryData.creds = JSON.stringify(queryData.creds);
        var encodedQuery = $httpParamSerializer(queryData).replace(/;/g,"%3B");
        queryRequest = {url: qwConstantsService.queryURL,
            method: "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded',
                      'ns-server-proxy-timeout':qwQueryService.options.query_timeout*1000,'CB-User-Agent': userAgent},
            data: encodedQuery,
            mnHttp: {
              group: "global"
            }
        };
        //console.log("Query data: " + JSON.stringify(queryData));
        //console.log("Encoded query: " + encodedQuery);
      }

      // if it's a userQuery, make sure to handle really long ints, and remember the
      // request in case we need to cancel

      if (is_user_query) {
        queryRequest.transformResponse = fixLongInts;
        qwQueryService.currentQueryRequest = queryRequest;
      }

      //
      // check the queryRequest to make sure it's not too big
      //

      if (qwConstantsService.maxRequestSize &&
          JSON.stringify(queryRequest).length >= qwConstantsService.maxRequestSize) {
        showErrorDialog("Query too large for GUI, try using CLI or REST API directly.")
        return(null);
      }

      //console.log("Built query: " + JSON.stringify(queryRequest));
      return(queryRequest);
    }

    //
    // convenience function to see if fields mentioned in a query are not found in the schema
    // for the buckets involved
    //

    function getProblemFields(fields) {
      var problem_fields = [];

      for (var f in fields) {
        var firstDot = f.indexOf(".");
        var bucketName = f.substring(0,firstDot);
        var fieldName = f.substring(firstDot + 1);
        //console.log("Checking field: " + f + ", bucket: " + bucketName);
        var bucket = _.find(qwQueryService.buckets,function (b) {return(b.id == bucketName);});
        if (bucket) {
          //console.log("  Got bucket: " + bucket + ", bucket schema: " + bucket.schema);
          if (bucket && bucket.schema.length > 0 && !isFieldNameInSchema(bucket.schema,fieldName)) {
            problem_fields.push({field: fieldName, bucket: bucket.id});
            //console.log("Field: " + fieldName + "is not o.k.");
          }
        }
      }

      return(problem_fields);
    }

    //
    // executeQuery
    //

    function executeQuery(queryText, userQuery, queryOptions, explainOnly) {
      var newResult;

      //console.log("Got query to execute: " + queryText);
      //logWorkbenchError("Got query to execute: " + queryText);

      // if the current query is part of the history,
      // or current query is "not yet run",
      // update the results from the history

      if ((currentQueryIndex < pastQueries.length &&
          lastResult.query.trim() === pastQueries[currentQueryIndex].query.trim()) ||
          (lastResult.status == newQueryTemplate.status)){
        newResult = executingQueryTemplate.clone();
        newResult.query = lastResult.query.trim();
        pastQueries[currentQueryIndex] = newResult; // forget previous results
      }

      // otherwise, we have a new/edited query, so we create a new empty result
      // at the end of the query history

      else {
        newResult = executingQueryTemplate.clone();
        newResult.query = lastResult.query.trim();
        pastQueries.push(newResult);
        currentQueryIndex = pastQueries.length - 1; // after run, set current result to end
      }

      // don't allow multiple queries, as indicated by anything after a semicolon
      // we test for semicolons in either single or double quotes, or semicolons outside
      // of quotes followed by non-whitespace. That final one is group 1. If we get any
      // matches for group 1, it looks like more than one query.

      if (qwConstantsService.forbidMultipleQueries) {
        var matchNonQuotedSemicolons = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|(;\s*\S+)/ig;
        var semicolonCount = 0;

        var matchArray = matchNonQuotedSemicolons.exec(queryText);
        while (matchArray != null) {
          if (matchArray[1]) // group 1, a non-quoted semicolon with non-whitespace following
            semicolonCount++;
          matchArray = matchNonQuotedSemicolons.exec(queryText);
        }

        if (semicolonCount > 0) {
          newResult.status = "errors";
          newResult.data = {error: "Error, you cannot issue more than one query at once. Please remove all text after the semicolon closing the first query."};
          newResult.result = JSON.stringify(newResult.data);
          newResult.explainResult = newResult.data;
          newResult.explainResultText = newResult.result;
          lastResult.copyIn(newResult);
          saveStateToStorage(); // save current history
          return null;
        }
      }

      // don't run new queries if existing queries are already running
      if (qwQueryService.executingQuery.busy)
        return;

      qwQueryService.executingQuery.busy = true;
      lastResult.result = executingQueryTemplate.result;
      lastResult.data = executingQueryTemplate.data;
      lastResult.status = executingQueryTemplate.status;
      lastResult.resultSize = executingQueryTemplate.resultSize;
      lastResult.resultCount = executingQueryTemplate.resultCount;

      var pre_post_ms = new Date().getTime(); // when did we start?

      //
      // if the query is not already an explain, run a version with explain to get the query plan
      //

      var queryIsExplain = /^\s*explain/gmi.test(queryText);
      var queryIsPrepare = /^\s*prepare/gmi.test(queryText);
      var explain_promise;

      if (!queryIsExplain && !queryIsPrepare && qwConstantsService.autoExplain) {

        newResult.explainDone = false;

        var explain_request = buildQueryRequest("explain " + queryText, false);
        if (!explain_request) {
          newResult.result = '{"status": "Query Failed."}';
          newResult.data = {status: "Query Failed."};
          newResult.status = "errors";
          newResult.resultCount = 0;
          newResult.resultSize = 0;
          newResult.queryDone = true;

          // can't recover from error, finish query
          lastResult.copyIn(newResult);
          finishQuery();
          return;
        }
        explain_promise = $http(explain_request)
        .then(function success(resp) {
          var data = resp.data, status = resp.status;

          // now check the status of what came back
          if (data && data.status == "success" && data.results && data.results.length > 0) {
            var lists = qwQueryPlanService.analyzePlan(data.results[0].plan,null);
            newResult.explainResult =
            {explain: data.results[0],
                analysis: lists,
                plan_nodes: qwQueryPlanService.convertPlanJSONToPlanNodes(data.results[0].plan, null, lists)
            };

            // let's check all the fields to make sure they are all valid
            var problem_fields = getProblemFields(newResult.explainResult.analysis.fields);
            if (problem_fields.length > 0)
              newResult.explainResult.problem_fields = problem_fields;
          }

          else if (data.errors) {
            newResult.explainResult = data.errors;
            newResult.explainResult.explain_query = explain_request.data.statement;
          }
          else
            newResult.explainResult = {'error': 'No server response for explain.'};

          newResult.explainDone = true;

          if (newResult.explainResult.explain)
            newResult.explainResultText = JSON.stringify(newResult.explainResult.explain, null, '  ');
          else
            newResult.explainResultText = JSON.stringify(newResult.explainResult, null, '  ');

          // if we're doing explain only, copy the explain results to the regular results as well

          if (explainOnly) {
            newResult.status = "Explain success";
            newResult.resultSize = null;
            newResult.data = newResult.explainResult;
            newResult.result = newResult.explainResultText;
          }

          // all done

          lastResult.copyIn(newResult);

          // if the query has run and finished already, mark everything as done
          if (newResult.queryDone || explainOnly) {
            finishQuery();
          }
        },
        /* error response from $http */
        function error(resp) {
          var data = resp.data, status = resp.status;
          //console.log("Explain error Data: " + JSON.stringify(data));
          //console.log("Request was: " + JSON.stringify(explain_request));

          //console.log("Explain error Status: " + JSON.stringify(status));
          //console.log("Explain error Headers: " + JSON.stringify(headers));

          if (data && _.isString(data)) {
            newResult.explainResult = {errors: data};
            newResult.explainResult.query_from_user = explain_request.data.statement;
          }
          else if (data && data.errors) {
            if (data.errors.length > 0)
              data.errors[0].query_from_user = explain_request.data.statement;
            newResult.explainResult = {errors: data.errors};
          }
          else {
            newResult.explainResult = {errors: "Unknown error getting explain plan"};
            newResult.explainResult.query_from_user = explain_request.data.statement;
          }

          newResult.explainDone = true;
          newResult.explainResultText = JSON.stringify(newResult.explainResult, null, '  ');

          // if we're doing explain only, copy the errors to the regular results as well

          if (explainOnly) {
            newResult.data = newResult.explainResult;
            newResult.result = newResult.explainResultText;
          }

          lastResult.copyIn(newResult);

          //console.log("Explain: " + newResult.explainResult);

          // if the query has run and finished already, mark everything as done
          if (newResult.queryDone || explainOnly) {
            newResult.status = "Explain error";
            finishQuery();
          }
        });

      }

      // if the query already was an explain query, mark the explain query as done
      else {
        newResult.explainDone = true;
        newResult.explainResult = {};
        newResult.explainResultText = "";
      }

      //
      // if they wanted only an explain, we're done
      //

      if (!queryIsExplain && explainOnly)
        return(explain_promise);

      //console.log("submitting query: " + JSON.stringify(qwQueryService.currentQueryRequest));

      //
      // Issue the request
      //

      newResult.queryDone = false;

      var request = buildQueryRequest(queryText, true, queryOptions);

      if (!request) {
        newResult.result = '{"status": "Query Failed."}';
        newResult.data = {status: "Query Failed."};
        newResult.status = "errors";
        newResult.resultCount = 0;
        newResult.resultSize = 0;
        newResult.queryDone = true;

        // make sure to only finish if the explain query is also done
        lastResult.copyIn(newResult);
        finishQuery();
        return;
      }
      var promise = $http(request)
      // SUCCESS!
      .then(function success(resp) {
        var data = resp.data, status = resp.status;
//      console.log("Success Data: " + JSON.stringify(data));
//      console.log("Success Status: " + JSON.stringify(status));
//      console.log("Success Headers: " + JSON.stringify(headers));
//      console.log("Success Config: " + JSON.stringify(config));

        var result;

        //      var post_post_ms = new Date().getTime();

        // make sure we show errors if the query did not succeed
        if (data.status == "success") {
          // if the results are empty, show some of the surrounding data
          if (_.isArray(data.results) && data.results.length == 0) {
            result = {};
            result.results = data.results;
            //result.metrics = data.metrics;
          }
          // otherwise, use the results
          else
            result = data.results;
        }
        else if (data.errors) {
          var failed = "Authorization Failed";
          // hack - detect authorization failed, make a suggestion
//          for (var i=0; i < data.errors.length; i++)
//            if (data.errors[i].msg &&
//                data.errors[i].msg.length >= failed.length &&
//                data.errors[i].msg.substring(0,failed.length) == failed)
//              data.errors[i].suggestion = "Try reloading bucket information by refreshing the Bucket Analysis pane.";

          result = data.errors;
        }
        else if (data.status == "stopped") {
          result = {status: "Query stopped on server."};
//          console.log("Success/Error Data: " + JSON.stringify(data));
//          console.log("Success/Error Status: " + JSON.stringify(status));
//          console.log("Success/Error Headers: " + JSON.stringify(headers));
//          console.log("Success/Error Config: " + JSON.stringify(config));
        }

        // if we got no metrics, create a dummy version

        if (!data.metrics) {
          data.metrics = {elapsedTime: 0.0, executionTime: 0.0, resultCount: 0, resultSize: "0", elapsedTime: 0.0}
        }

        newResult.status = data.status;
        newResult.elapsedTime = data.metrics.elapsedTime;
        newResult.executionTime = data.metrics.executionTime;
        newResult.resultCount = data.metrics.resultCount;
        if (data.metrics.mutationCount)
          newResult.mutationCount = data.metrics.mutationCount;
        newResult.resultSize = data.metrics.resultSize;
        if (data.rawJSON)
          newResult.result = data.rawJSON;
        else
          newResult.result = angular.toJson(result, true);
        newResult.data = result;
        newResult.requestID = data.requestID;

        // did we get query timings in the result? If so, update the plan

        if (data.profile && data.profile.executionTimings) {
          var lists = qwQueryPlanService.analyzePlan(data.profile.executionTimings,null);
          newResult.explainResult =
          {explain: data.profile.executionTimings,
              analysis: lists,
              plan_nodes: qwQueryPlanService.convertPlanJSONToPlanNodes(data.profile.executionTimings,null,lists)
              /*,
              buckets: qwQueryService.buckets,
              tokens: qwQueryService.autoCompleteTokens*/};
          newResult.explainResultText = JSON.stringify(newResult.explainResult.explain,null,'  ');

          // let's check all the fields to make sure they are all valid
          var problem_fields = getProblemFields(newResult.explainResult.analysis.fields);
          if (problem_fields.length > 0)
            newResult.explainResult.problem_fields = problem_fields;
        }

        newResult.queryDone = true;

        // if this was an explain query, change the result to show the
        // explain plan

        if (queryIsExplain && qwConstantsService.autoExplain) {
          var lists = qwQueryPlanService.analyzePlan(data.results[0].plan,null);
          newResult.explainResult =
          {explain: data.results[0],
              analysis: lists,
              plan_nodes: qwQueryPlanService.convertPlanJSONToPlanNodes(data.results[0].plan,null,lists)
              /*,
              buckets: qwQueryService.buckets,
              tokens: qwQueryService.autoCompleteTokens*/};
          newResult.explainResultText = JSON.stringify(newResult.explainResult.explain, null, '  ');
          qwQueryService.selectTab(4); // make the explain visible
        }

        // make sure to only finish if the explain query is also done
        if (newResult.explainDone) {
          //console.log("Query done, got explain: " + newResult.explainResultText);

          lastResult.copyIn(newResult);
          finishQuery();
        }
      },
      /* error response from $http */
      function error(resp) {
        var data = resp.data, status = resp.status;
//        console.log("Error Data: " + JSON.stringify(data));
//        console.log("Request was: " + JSON.stringify(request));
//      console.log("Error Status: " + JSON.stringify(status));
//      console.log("Error Headers: " + JSON.stringify(headers));
      //console.log("Error Config: " + JSON.stringify(config));

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
          newResult.queryDone = true;

          // make sure to only finish if the explain query is also done
          if (newResult.explainDone) {
            lastResult.copyIn(newResult);
            // when we have errors, don't show theh plan tabs
            if (qwQueryService.isSelected(4) || qwQueryService.isSelected(5))
              qwQueryService.selectTab(1);
            finishQuery();
          }
          return;
        }

        // data is null? query interrupted
        if (data === null) {
          newResult.result = '{"status": "Query interrupted."}';
          newResult.data = {status: "Query interrupted."};
          newResult.status = "errors";
          newResult.resultCount = 0;
          newResult.resultSize = 0;
          newResult.queryDone = true;

          // make sure to only finish if the explain query is also done
          if (newResult.explainDone) {
            lastResult.copyIn(newResult);
            // when we have errors, don't show theh plan tabs
            if (qwQueryService.isSelected(4) || qwQueryService.isSelected(5))
              qwQueryService.selectTab(1);
            finishQuery();
          }
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

          newResult.result = JSON.stringify(newResult.data,null,'  ');
          newResult.status = "errors";
          newResult.queryDone = true;

          // make sure to only finish if the explain query is also done
          if (newResult.explainDone) {
            lastResult.copyIn(newResult);
            // when we have errors, don't show theh plan tabs
            if (qwQueryService.isSelected(4) || qwQueryService.isSelected(5))
              qwQueryService.selectTab(1);
            finishQuery();
          }
          return;
        }

        if (data.errors) {
          if (_.isArray(data.errors) && data.errors.length >= 1) {
            if (userQuery)
              data.errors[0].query_from_user = userQuery;
            //data.errors[0].query_with_limit = queryText;
          }
          newResult.data = data.errors;
          newResult.result = JSON.stringify(data.errors,null,'  ');
        }

        if (status)
          newResult.status = status;
        else
          newResult.status = "errors";

        if (data.metrics) {
          newResult.elapsedTime = data.metrics.elapsedTime;
          newResult.executionTime = data.metrics.executionTime;
          newResult.resultCount = data.metrics.resultCount;
          if (data.metrics.mutationCount)
            newResult.mutationCount = data.metrics.mutationCount;
          newResult.resultSize = data.metrics.resultSize;
        }

        if (data.requestID)
          newResult.requestID = data.requestID;

        newResult.queryDone = true;

        // make sure to only finish if the explain query is also done
        if (newResult.explainDone) {
          lastResult.copyIn(newResult);
          // when we have errors, don't show theh plan tabs
          if (qwQueryService.isSelected(4) || qwQueryService.isSelected(5))
            qwQueryService.selectTab(1);
          finishQuery();
        }
      });

      return(promise);

    }

    //
    // whenever a query finishes, we need to set the state to indicate teh query
    // is not longer running.
    //

    function finishQuery() {
      saveStateToStorage();                       // save the state
      qwQueryService.currentQueryRequest = null;  // no query running
      qwQueryService.executingQuery.busy = false; // enable the UI
    }

    //
    // manage metadata, including buckets, fields, and field descriptions
    //

    function updateQueryMonitoring(category) {

      var query1 = "select active_requests.* from system:active_requests";
      var query2 = "select completed_requests.* from system:completed_requests";
      var query3 = "select prepareds.* from system:prepareds";
      var query = "foo";

      switch (category) {
      case 1: query = query1; break;
      case 2: query = query2; break;
      case 3: query = query3; break;
      default: return;
      }

      var result = [];

      //console.log("Got query: " + query);

//      var config = {headers: {'Content-Type':'application/json','ns-server-proxy-timeout':20000}};
     // console.log("Running monitoring cat: " + category + ", query: " + payload.statement);

      return(executeQueryUtil(query,false))
      .then(function success(response) {
        var data = response.data;
        var status = response.status;
        var headers = response.headers;
        var config = response.config;

        if (data.status == "success") {
          result = data.results;

          // we need to reformat the duration values coming back
          // since they are in the most useless format ever.

          for (var i=0; i< result.length; i++) if (result[i].elapsedTime) {
            result[i].elapsedTime = qwQueryPlanService.convertTimeToNormalizedString(result[i].elapsedTime);
          }
        }
        else {
          result = [data.errors];
        }

        switch (category) {
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
    // whenever the system changes, we need to update the list of valid buckets
    //

    $rootScope.$on("indexStatusURIChanged",updateBuckets);
    $rootScope.$on("bucketUriChanged",updateBuckets);
    $rootScope.$on("checkBucketCounts",updateBucketCounts);

    function updateBuckets(event,data) {
      validateQueryService.getBucketsAndNodes(updateBucketsCallback);
    }

    function updateBucketCounts(event,data) {
      getInfoForBucketBackground(qwQueryService.buckets,0,true); // update bucket counts after each successful query
    }

    function updateBucketsCallback() {
      //console.log("Inside updateBucketsCallback");
      // use a query to get buckets with a primary index

      var queryText = qwConstantsService.keyspaceQuery;

      res1 = executeQueryUtil(queryText, false)
      .then(function success(resp) {
        var data = resp.data, status = resp.status;

        // remember the counts of each bucket so the screen doesn't blink when recomputing counts
        var bucket_counts = {};
        for (var i=0; i < qwQueryService.buckets.length; i++) {

          bucket_counts[qwQueryService.buckets[i].id] = qwQueryService.buckets[i].count;
        }

        // initialize the data structure for holding all the buckets
        qwQueryService.buckets.length = 0;
        qwQueryService.bucket_errors = null;
        qwQueryService.bucket_names.length = 0;
        qwQueryService.autoCompleteTokens = {};

        if (data && data.results) for (var i=0; i< data.results.length; i++) {
          var bucket = data.results[i];
          bucket.expanded = false;
          bucket.schema = [];
          //bucket.passwordNeeded = qwConstantsService.sendCreds; // only need password if creds supported
          bucket.indexes = [];
          bucket.validated = !validateQueryService.validBuckets ||
            _.indexOf(validateQueryService.validBuckets(),bucket.id) != -1 ||
            _.indexOf(validateQueryService.validBuckets(),".") != -1;
          bucket.count = bucket_counts[bucket.id];
          //console.log("Got bucket: " + bucket.id + ", valid: " + bucket.validated);
          if (bucket.validated) {
            qwQueryService.buckets.push(bucket); // only include buckets we have access to
            qwQueryService.bucket_names.push(bucket.id);
          }
          addToken(bucket.id,"bucket");
        }

        refreshAutoCompleteArray();

        //
        // Should we go get information for each bucket?
        //

        if (qwConstantsService.showSchemas)
          getInfoForBucketBackground(qwQueryService.buckets,0);

        /////////////////////////////////////////////////////////////////////////
        // now run a query to get the list of indexes
        /////////////////////////////////////////////////////////////////////////

        if (qwConstantsService.showSchemas) {
          queryText = "select indexes.* from system:indexes";

          res1 = executeQueryUtil(queryText, false)
          //res1 = $http.post("/_p/query/query/service",{statement : queryText})
          .then(function (resp) {
            var data = resp.data, status = resp.status;

            //console.log("Got index info: " + JSON.stringify(data));

            if (data && _.isArray(data.results)) {
              qwQueryService.indexes = data.results;
              // make sure each bucket knows about each relevant index
              for (var i=0; i < data.results.length; i++) {
                addToken(data.results[i].name,'index');
                for (var b=0; b < qwQueryService.buckets.length; b++)
                  if (data.results[i].keyspace_id === qwQueryService.buckets[b].id) {
                    qwQueryService.buckets[b].indexes.push(data.results[i]);
                    break;
                  }
              }
            }

            refreshAutoCompleteArray();
          },

          // error status from query about indexes
          function index_error(resp) {
            var data = resp.data, status = resp.status;

            //console.log("Ind Error Data: " + JSON.stringify(data));
            //console.log("Ind Error Status: " + JSON.stringify(status));
            //console.log("Ind Error Headers: " + JSON.stringify(headers));
            //console.log("Ind Error statusText: " + JSON.stringify(statusText));

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

      },
      /* error response from $http */
      function error(resp) {
        var data = resp.data, status = resp.status;
//        console.log("Schema Error Data: " + JSON.stringify(data));
//        console.log("Schema Error Status: " + JSON.stringify(status));
//        console.log("Schema Error Headers: " + JSON.stringify(headers));
//        console.log("Schema Error Config: " + JSON.stringify(config));
        var error = "Error retrieving list of buckets";

        if (data && data.errors)
          error = error + ": " + JSON.stringify(data.errors);
        else if (status)
          error = error + ", contacting query service returned status: " + status;

        qwQueryService.buckets.length = 0;
        qwQueryService.autoCompleteTokens = {};
        qwQueryService.bucket_errors = error;
        logWorkbenchError(error);
      });


    }

    //
    // this method uses promises and recursion to get the schemas for a list of
    // buckets in sequential order, waiting for each one before moving on to the next.
    // the first thing we do is get the count of documents in the bucket. This might
    // return an authentication error, meaning that the bucket is locked to us. Once
    // we have the count information, and validate access, we get the schema for the bucket
    //

    function getInfoForBucketBackground(bucketList,currentIndex,countsOnly) {
      // if we've run out of buckets, nothing more to do
      if (currentIndex < 0 || currentIndex >= bucketList.length)
        return;

      //console.log("Getting info for: " + bucketList[currentIndex].id);

      testAuth(bucketList[currentIndex],
      function() { // authentication succeeded, get the schema for the bucket unless we're doing counts only
        var res = countsOnly ? null : getSchemaForBucket(bucketList[currentIndex]);
        if (res && res.then)
          res.then(function successCallback(response) {
            getInfoForBucketBackground(bucketList,currentIndex+1);
          }, function errorCallback(response) {
            getInfoForBucketBackground(bucketList,currentIndex+1);
          });
        // if they wanted counts only, just get the count for the next one
        else
          getInfoForBucketBackground(bucketList,currentIndex+1,countsOnly);
      },
      function() { // authentication failed, just move on to the next bucket
        getInfoForBucketBackground(bucketList,currentIndex+1,countsOnly);
      });
    }


    //
    // test authentication for a bucket by asking for the document count, if no permissions error 10000 comes back
    //

    function testAuth(bucket, success, failure) {
      // start by getting the document count for each bucket
      queryText = "select count(*) cnt from `" + bucket.id + '`';

      res1 = executeQueryUtil(queryText, false)
      .then(function successCallback(resp) {
        var data = resp.data, status = resp.status;

        // data might have a result array with an object {cnt: <count> }
        if (data && _.isArray(data.results) && data.results.length > 0 && _.isNumber(data.results[0].cnt)) {
          bucket.count = data.results[0].cnt;
          success();
        }

        // data might have authorization error
        else if (data.errors && _.isArray(data.errors) && data.errors.length > 0 &&
            (data.errors[0].code == 10000 || data.errors[0].code == 13014)) {
          bucket.schema_error = data.errors[0].msg;
          // passwords only supported 4.5 and below
          if (mnPoolDefault.export.compat && !mnPoolDefault.export.compat.atLeast50)
            bucket.passwordNeeded = true;
          failure();
        }

        // otherwise, failure
        else
          failure();
      },

      // error status from query about indexes
      function errorCallback(resp) {
        var data = resp.data, status = resp.status;
        // for 4.5+, auth errors come back here
        if (data && data.errors && _.isArray(data.errors) && data.errors.length > 0 &&
            (data.errors[0].code == 10000 || data.errors[0].code == 13014)) {
          // passwords only supported 4.5 and below
          if (mnPoolDefault.export.compat && !mnPoolDefault.export.compat.atLeast50)
            bucket.passwordNeeded = true;
          bucket.schema_error = data.errors[0].msg;
        }
        failure();
      });
    }

    //
    // Get a schema for a given, named bucket.
    //

    function getSchemaForBucket(bucket) {

      // no schema inferencing until version 4.5, and then only enterprise

      if (!mnPoolDefault.export.compat.atLeast45 || !mnPools.export.isEnterprise) {
        bucket.schema_error = "Version 4.5 EE or above needed for Schema inferencing.";
        return;
      }

      //console.log("Getting schema for : " + bucket.id);

      //return $http(inferQueryRequest)
      return executeQueryUtil("infer `" + bucket.id + "`;", false)
      .then(function successCallback(response) {
        //console.log("Done with schema for: " + bucket.id);
        //console.log("Schema status: " + status);
        //console.log("Schema data: " + JSON.stringify(response.data));

        bucket.schema.length = 0;

        if (!response || !response.data)
          bucket.schema_error = "Empty or invalid server response: ";
        else if (response.data.errors) {
          bucket.schema_error = "Unable to get schema: " + JSON.stringify(response.data.errors);
        }
        else if (response.data.status == "stopped") {
          bucket.schema_error = "Unable to get schema, query stopped on server.";
        }
        else if (response.data.status != "success") {
          bucket.schema_error = "Unable to get schema: " + response.data.status;
        }
        else if (_.isString(response.data.results))
          bucket.schema_error = response.data.results;
        else {
          //console.log("Got schema: " + JSON.stringify(response.data.results));
          bucket.schema = response.data.results[0];

          var totalDocCount = 0;
          for (var i=0; i<bucket.schema.length; i++)
            totalDocCount += bucket.schema[i]['#docs'];

          getFieldNamesFromSchema(bucket.schema,"");
          getFieldNamesFromSchema(bucket.schema,bucket.name);
          refreshAutoCompleteArray();

          //console.log("for bucket: " + bucket.name + " got doc count: " + totalDocCount)
          bucket.totalDocCount = totalDocCount;

          for (var i=0; i<bucket.schema.length; i++)
            bucket.schema[i]['%docs'] = (bucket.schema[i]['#docs']/totalDocCount*100);

          // we have an array of columns that are indexed. Let's mark the individual
          // fields, now that we have a schema.
          bucket.indexed_fields = {};

          // each element of the sec_ind array is an array of field names, turn into a map
          _.forEach(bucket.sec_ind,function(elem) {
            _.forEach(elem,function(field) {
              // for now we can't handle objects inside arrays, so we'll just flag the
              // array field as having an index. Also, we need to remove any parens.
              var bracket = field.indexOf('[');
              if (bracket >= 0)
                field = field.substring(0,bracket);

              field = field.replace(/\(/g,'').replace(/\)/g,'');

              //console.log("Index on: " + field);
              bucket.indexed_fields[field] = true;
            })});

          for (var flavor=0; flavor<bucket.schema.length; flavor++) { // iterate over flavors
            markIndexedFields(bucket.indexed_fields, bucket.schema[flavor], "");
            bucket.schema[flavor].hasFields = Object.keys(bucket.schema[flavor].properties).length > 0;
          }

          if (bucket.schema.length)
            bucket.schema.unshift({Summary: "Summary: " + bucket.schema.length + " flavors found, sample size "+ totalDocCount + " documents",
              hasFields: true});
        }

      }, function errorCallback(response) {
        var error = "Error getting schema for bucket: " + bucket.id;
        if (response)
          if (response.data && response.data.errors) {
            error += ", " + JSON.stringify(response.data.errors,null,'  ');
            bucket.schema_error = response.data.errors;
          }
          else if (response.status)
            error += ", " + response.status;
          else
            error += JSON.stringify(response);

        console.log("   error: " + error);
      });

    };

    //
    // When we get the schema, we need to mark the indexed fields. We start at the top
    // level, but recursively traverse any subtypes, keeping track of the path that we
    // followed to get to the subtype.
    //

    function markIndexedFields(fieldMap, schema, path) {
      //console.log("marking schema size: "+schema.fields.length + " with path: " + path);

      _.forEach(schema['properties'], function(theField, field_name) {
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
          markIndexedFields(fieldMap,theField,path + '`' + field_name + '`.');
      });
    };


    //
    // javascript can't handle long ints - any number more than 53 bits cannot be represented
    // with perfect precision. yet the JSON format allows for long ints. To avoid rounding errors,
    // we will search returning data for non-quoted long ints, and if they are found,
    // 1) put the raw bytes of the result into a special field, so that the JSON editor can
    //    show long ints as they came from the server
    // 2) convert all long ints into quoted strings, so they appear properly in the table and tree
    //    views
    //

    function fixLongInts(rawBytes) {
      if (!rawBytes)
        return rawBytes;

      var matchNonQuotedLongInts = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|([:\s][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*)[,\s}]/ig;
      var longIntCount = 0;
      var matchArray = matchNonQuotedLongInts.exec(rawBytes);
      while (matchArray != null) {
        if (matchArray[1]) // group 1, a non-quoted long int
          longIntCount++;
        matchArray = matchNonQuotedLongInts.exec(rawBytes);
      }

      //console.log("Got response, longIntcount: " + longIntCount + ", raw bytes: " + rawBytes);

      // if no long ints, just return the original bytes parsed

      if (longIntCount == 0) try {
        return(JSON.parse(rawBytes));
      }
      catch (e) {
        return(rawBytes);
      }

      // otherwise copy the raw bytes, replace all long ints in the copy, and add the raw bytes as a new field on the result
      else {
        matchNonQuotedLongInts.lastIndex = 0;
        matchArray = matchNonQuotedLongInts.exec(rawBytes);
        //console.log("Old raw: " + rawBytes);
        var result = JSON.parse(rawBytes);
        var newBytes = "";
        var curBytes = rawBytes;

        while (matchArray != null) {
          if (matchArray[1]) { // group 1, a non-quoted long int
            //console.log("  Got longInt: " + matchArray[1] + " with lastMatch: " + matchNonQuotedLongInts.lastIndex);
            //console.log("  remainder: " + rawBytes.substring(matchNonQuotedLongInts.lastIndex,matchNonQuotedLongInts.lastIndex + 10));
            var matchLen = matchArray[1].length;
            newBytes += curBytes.substring(0,matchNonQuotedLongInts.lastIndex - matchLen) + '"' +
              matchArray[1].substring(1) + '"';
            curBytes = curBytes.substring(matchNonQuotedLongInts.lastIndex - 1);
            matchNonQuotedLongInts.lastIndex = 0;
          }
          matchArray = matchNonQuotedLongInts.exec(curBytes);
        }
        newBytes += curBytes;
        //console.log("New raw: " + newBytes);
        result = JSON.parse(newBytes);

        // see if we can pull just the result out of the rawBytes
        var rawResult = findResult(rawBytes);

        if (rawResult)
          result.rawJSON = '\t' + rawResult;
        else
          result.rawJSON = rawBytes;

        return result;
      }
    }

    //
    // getRawResultsFromBytes
    //
    // there's a lot of stuff coming back with query results, but we want only the
    // results themselves. With long numbers, we have to pull those results out of
    // the raw bytes without parsing them.
    //

    function findResult(buffer) {
      // the stuff coming back from the server is a JSON object: "{" followed by
      // quoted field names, ":", and a JSON value (which is recursive). Since we want
      // to find the results without parsing, find the "results: " key, then figure
      // out where it ends.

      var curLoc = 0;
      var whitespace = /\s/;
      var len = buffer.length;

      while (curLoc < len && whitespace.test(buffer.charAt(curLoc))) curLoc++; // ignore whitespace

      if (curLoc >= len && buffer.charAt(curLoc) != '{')
        return null; // expect object start
      else
        curLoc++;

      // loop through each field/value until we see a close brace

      while (curLoc < len) {
        // past the opening of the object, now look for quoted field names followed by ":"
        while (curLoc < len && whitespace.test(buffer.charAt(curLoc))) curLoc++; // ignore whitespace

        if (curLoc >= len || buffer.charAt(curLoc) != '"') // expect open quote
          return null; // expect field name start, otherwise we are done
        else
          curLoc++;

        var fieldStart = curLoc++;
        curLoc = moveToEndOfString(buffer,curLoc);
        if (curLoc >= len) return(null); //make sure we didn't go off the end

        var fieldName = buffer.substring(fieldStart,curLoc);
        //console.log("Got field: " + fieldName);

        var valueStart = curLoc + 3;
        curLoc = moveToEndOfValue(buffer,curLoc + 1); // start after close quote

        //console.log("raw: " + buffer.substring(fieldStart-1,curLoc-1));

        if (curLoc < len && fieldName == "results")
          return(buffer.substring(valueStart,curLoc-1));
      }
    }

    //
    // utility function to traverse strings, finding the end
    //

    function moveToEndOfString(buffer,curLoc) {
      while (curLoc < buffer.length) {     // loop until close quote
        var cur = buffer.charAt(curLoc);
        if (cur == '\\')
          curLoc += 2; // skip quoted characters
        else if (cur != '"')
          curLoc ++;
        else
          break;
      }
      return curLoc;
    }

    // utility function to find the end of a value, which might be an number, string,
    // object, or array, whose value ends with a comma or a close brace (marking
    // the end of everything)

    function moveToEndOfValue(buffer,curLoc) {
      // now parse the value, which might be an number, string, object, or array,
      // whose value ends with a comma or a close brace (marking the end of everything)

      var braceCount = 0;
      var bracketCount = 0;

      while (curLoc < buffer.length) {
        //console.log(curLoc + ": " + buffer.charAt(curLoc) + ", braces: " + braceCount + ", brackets: " + bracketCount);
        switch (buffer.charAt(curLoc++)){
        case '{': braceCount++; break;
        case '}': // if we're not inside an array or object, we're done
          if (braceCount == 0 && bracketCount == 0)
            return(curLoc);
          else
            braceCount--;
          break;
        case '[': bracketCount++; break;
        case ']': bracketCount--; break;
        case '"': curLoc = moveToEndOfString(buffer,curLoc) + 1; break;
        case ',':
          if (braceCount == 0 && bracketCount == 0)
            return(curLoc);
          break;
        default: // ignore other characters
        }
      }
      return(curLoc);
    }

    //
    // show an error dialog
    //

    function showErrorDialog(message) {
      var subdirectory = ($('#currentUI').height() != null) ? '/ui-current' : '/ui-classic';

      var dialogScope = $rootScope.$new(true);
      dialogScope.error_title = "Error";
      dialogScope.error_detail = message;

      $uibModal.open({
        templateUrl: '../_p/ui/query' + subdirectory + '/password_dialog/qw_query_error_dialog.html',
        scope: dialogScope
      });
    }

    function showWarningDialog(message) {
      var subdirectory = ($('#currentUI').height() != null) ? '/ui-current' : '/ui-classic';

      var dialogScope = $rootScope.$new(true);
      dialogScope.error_title = "Warning";
      dialogScope.error_detail = message;

      $uibModal.open({
        templateUrl: '../_p/ui/query' + subdirectory + '/password_dialog/qw_query_error_dialog.html',
        scope: dialogScope
      });
    }

    //
    // load state from storage if possible
    //

    loadStateFromStorage();

    //
    // when we are initialized, get the list of buckets
    //

    $timeout(function(){
      updateBuckets();
    },500);

    //
    // all done creating the service, now return it
    //

    return qwQueryService;
  }



})();
