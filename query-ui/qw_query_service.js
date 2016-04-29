(function() {

  angular.module('qwQuery').factory('qwQueryService', getQwQueryService);

  getQwQueryService.$inject = ['$q', '$timeout', '$http', 'mnHelper', 'mnPendingQueryKeeper', '$httpParamSerializer'];

  function getQwQueryService($q, $timeout, $http, mnHelper, mnPendingQueryKeeper, $httpParamSerializer) {

    var qwQueryService = {};

    //
    // remember which tab is selected for output style: JSON, table, or tree
    //

    qwQueryService.selectTab = function(newTab) {qwQueryService.outputTab = newTab;};
    qwQueryService.isSelected = function(checkTab) {return qwQueryService.outputTab === checkTab;};

    qwQueryService.outputTab = 1;     // remember selected output tab
    qwQueryService.defaultLimit = 500;
    qwQueryService.limit = {max: qwQueryService.defaultLimit};

    // access to our most recent query result, and functions to traverse the history
    // of different results

    qwQueryService.getResult = function() {return lastResult;};
    qwQueryService.getCurrentIndex = getCurrentIndex;
    qwQueryService.clearHistory = clearHistory;
    qwQueryService.hasPrevResult = hasPrevResult;
    qwQueryService.hasNextResult = hasNextResult;
    qwQueryService.prevResult = prevResult;
    qwQueryService.nextResult = nextResult;

    qwQueryService.canCreateBlankQuery = canCreateBlankQuery;

    //
    // keep track of the bucket and field names we have seen, for use in autocompletion
    //

    qwQueryService.autoCompleteTokens = {}; // keep a map, name and kind
    qwQueryService.autoCompleteArray = []; // array for use with Ace Editor

    // execute queries, and keep track of when we are busy doing so

    qwQueryService.executingQuery = {busy: false};
    qwQueryService.currentQueryRequest = null;
    qwQueryService.currentQueryRequestID = null;
    qwQueryService.executeQuery = executeQuery;
    qwQueryService.cancelQuery = cancelQuery;

    // update store the metadata about buckets

    qwQueryService.buckets = [];
    qwQueryService.gettingBuckets = {busy: false};
    qwQueryService.updateBuckets = updateBuckets;             // get list of buckets
    qwQueryService.getSchemaForBucket = getSchemaForBucket;   // get schema
    qwQueryService.authenticateBuckets = authenticateBuckets; // check password

    // for the front-end, distinguish error status and good statuses

    qwQueryService.status_success = status_success;
    qwQueryService.status_fail = status_fail;

    function status_success() {return(lastResult.status == 'success');}
    function status_fail()
    {return(lastResult.status == '400' ||
        lastResult.status == 'errors' ||
        lastResult.status == '500' ||
        lastResult.status == '404');}

    //
    // this structure holds the current query text, the current query result,
    // and defines the object for holding the query history
    //

    function QueryResult(status,elapsedTime,executionTime,resultCount,resultSize,result,data,query,requestID) {
      this.status = status;
      this.resultCount = resultCount;
      this.resultSize = resultSize;
      this.result = result;
      this.data = data;
      this.query = query;
      this.requestID = requestID;

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
          this.resultSize,this.result,this.data,this.query,this.requestID);
    };
    QueryResult.prototype.copyIn = function(other)
    {
      this.status = other.status;
      this.elapsedTime = truncateTime(other.elapsedTime);
      this.executionTime = truncateTime(other.executionTime);
      this.resultCount = other.resultCount;
      this.resultSize = other.resultSize;
      this.result = other.result;
      this.data = other.data;
      this.query = other.query;
      this.requestID = other.requestID;
    };


    //
    // structures for remembering queries and results
    //

    var dummyResult = new QueryResult('-','-','-','0','0','',{},'');
    var lastResult = dummyResult.clone();
    var savedResultTemplate = dummyResult.clone();
    savedResultTemplate.status = "cached query";
    savedResultTemplate.result = '{"data_not_cached": "hit execute to rerun query"}';
    savedResultTemplate.data = {data_not_cached: "hit execute to rerun query"};

    var newQueryTemplate = dummyResult.clone();
    newQueryTemplate.status = "not yet run";
    newQueryTemplate.result = '{"no_data_yet": "hit execute to run query"}';
    newQueryTemplate.data = {no_data_yet: "hit execute to run query"};

    var executingQueryTemplate = dummyResult.clone();
    executingQueryTemplate.status = "executing";
    executingQueryTemplate.result = '{"status": "Executing Statement"}';
    executingQueryTemplate.data = {status: "Executing Statement"};
    executingQueryTemplate.resultSize = 0;
    executingQueryTemplate.resultCount = 0;


    var pastQueries = [];       // keep a history of past queries and their results
    var currentQueryIndex = 0;  // where in the array are we? we start past the
    // end of the array, since there's no history yet

    //
    // where are we w.r.t. the query history?
    //

    function getCurrentIndex() {
      return (currentQueryIndex+1) + "/" + (pastQueries.length == 0 ? 1 : pastQueries.length);
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
    var localStorageKey = 'CouchbaseQueryWorkbenchState_' + window.location.host;

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
          qwQueryService.limit = savedState.limit;
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
      savedState.limit = qwQueryService.limit;
      savedState.currentQueryIndex = currentQueryIndex;
      savedState.lastResult = savedResultTemplate.clone();
      savedState.lastResult.query = lastResult.query;
      _.forEach(pastQueries,function(queryRes,index) {
        var qcopy = savedResultTemplate.clone();
        qcopy.query = queryRes.query;
        savedState.pastQueries.push(qcopy);
      });

      localStorage[localStorageKey] = JSON.stringify(savedState);
      //
      //console.log("Saving state to storage: " + JSON.stringify(savedState));
    }

    //
    // functions for adding new tokens and refreshing the token array
    //

    function addToken(token, type) {
      // see if the token needs to be quoted
      if (token.indexOf(' ') >= 0 || token.indexOf('-') >= 0)
        qwQueryService.autoCompleteTokens['`' + token + '`'] = type;
      else
        qwQueryService.autoCompleteTokens[token] = type;
    };


    function refreshAutoCompleteArray() {
      qwQueryService.autoCompleteArray.length = 0;

      for (var key in qwQueryService.autoCompleteTokens) {
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
        var newResult = newQueryTemplate.clone();
        newResult.query = "";
        pastQueries.push(newResult);
        currentQueryIndex++;
        lastResult.copyIn(pastQueries[currentQueryIndex]);
      }
    }

    function clearHistory() {
      // don't clear the history if existing queries are already running
      if (qwQueryService.executingQuery.busy)
        return;

      lastResult.copyIn(dummyResult);
      pastQueries.length = 0;
      currentQueryIndex = 0;
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
      if (qwQueryService.currentQueryRequest != null) {
        var queryInFly = mnPendingQueryKeeper.getQueryInFly(qwQueryService.currentQueryRequest);
        queryInFly && queryInFly.canceler("test");

        //
        // also submit a new query to delete the running query on the server
        //

        var query = 'delete from system:active_requests where ClientContextID = "' +
          qwQueryService.currentQueryRequestID + '";';
        var queryData = {statement: query , client_context_id: UUID.generate()};

        var encodedQuery = $httpParamSerializer(queryData).replace(/;/g,"%3B");
        qwQueryService.currentQueryRequest = {url: "/_p/query/query/service",
            method: "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded','ns-server-proxy-timeout':300*1000},
            data: encodedQuery
        };
        var promise = $http(qwQueryService.currentQueryRequest)

        // sanity check - if there was an error put a message in the console.
        .error(function(data, status, headers, config) {
          console.log("Error cancelling query.");
          console.log("    Data: " + JSON.stringify(data));
          console.log("    Status: " + JSON.stringify(status));
        });


      }
    }

    //
    // call the proxy which handles N1QL queries
    //

    function executeQuery(queryText, userQuery) {
      var newResult;

      // if the current query is part of the history,
      // or currentQuery is "not yet run",
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
        newResult.result = '{"error": "you cannot issue more than one query at once."}';
        newResult.data = {error: "Error, you cannot issue more than one query at once."};
        lastResult.copyIn(newResult);
        saveStateToStorage(); // save current history
        return null;
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
      // create a data structure for holding the query, and the credentials for any SASL
      // protected buckets
      //

      var queryData = {statement: queryText};
      var credString = "";
      for (var i = 0; i < qwQueryService.buckets.length; i++) {
        if (credString.length > 0)
          credString += ",";

        var pw = qwQueryService.buckets[i].password ?
            qwQueryService.buckets[i].password : "";

            credString += '{"user":"local:'+qwQueryService.buckets[i].id+'","pass":"' +
            pw +'"}';
      }

      // add the credentials for bucket passwords
      if (credString.length > 0)
        queryData.creds = '[' + credString + ']';

      qwQueryService.currentQueryRequestID = UUID.generate();
      queryData.client_context_id = qwQueryService.currentQueryRequestID;

      // send the query off via REST API
      //
      //
      var timeout = 300; // query timeout in seconds

      // Because Angular automatically urlencodes JSON parameters, but has a special
      // algorithm that doesn't encode semicolons, any semicolons inside the query
      // will get mis-parsed by the server as the end of the parameter (see MB-18621
      // for an example). To bypass this, we will url-encode ahead of time, and then
      // make sure the semicolons get urlencoded as well.

      var encodedQuery = $httpParamSerializer(queryData).replace(/;/g,"%3B");
      qwQueryService.currentQueryRequest = {url: "/_p/query/query/service",
          method: "POST",
          headers: {'Content-Type': 'application/x-www-form-urlencoded','ns-server-proxy-timeout':timeout*1000},
          data: encodedQuery
          };

      // An alternate way to get around Angular's encoding is "isNotForm: true". But
      // that triggers bug MB-16964, where the server currently fails to parse creds
      // when they are JSON encoded.

//    qwQueryService.currentQueryRequest = {
//    url: "/_p/query/query/service",
//    method: "POST",
//    headers: {'Content-Type':'application/json','ns-server-proxy-timeout':timeout*1000},
//    data: queryData,
//    qwHttp: {isNotForm: true}
//};

      //console.log("submitting query: " + JSON.stringify(qwQueryService.currentQueryRequest));

      //
      // Issue the request
      //

      var promise = $http(qwQueryService.currentQueryRequest)

      // SUCCESS!
      .success(function(data, status, headers, config) {
//        console.log("Success Data: " + JSON.stringify(data));
//        console.log("Success Status: " + JSON.stringify(status));
//        console.log("Success Headers: " + JSON.stringify(headers));
//        console.log("Success Config: " + JSON.stringify(config));

        var result;

        //      var post_post_ms = new Date().getTime();

        // make sure we show errors if the query did not succeed
        if (data.status == "success") {
          // if the results are empty, show some of the surrounding data
          if (_.isArray(data.results) && data.results.length == 0) {
            result = {};
            result.results = data.results;
            result.metrics = data.metrics;
          }
          // otherwise, use the results
          else
            result = data.results;
        }
        else {
          var failed = "Authorization Failed";
          // hack - detect authorization failed, make a suggestion
          for (var i=0; i < data.errors.length; i++)
            if (data.errors[i].msg &&
                data.errors[i].msg.length >= failed.length &&
                data.errors[i].msg.substring(0,failed.length) == failed)
              data.errors[i].suggestion = "Try authorizing the necessary bucket(s) in the metadata panel to the left.";

          result = data.errors;
        }

        // if we got no metrics, create a dummy version

        if (!data.metrics) {
          data.metrics = {elapsedTime: 0.0, executionTime: 0.0, resultCount: 0, resultSize: "0", elapsedTime: 0.0}
        }

        newResult.status = data.status;
        newResult.elapsedTime = data.metrics.elapsedTime;
        newResult.executionTime = data.metrics.executionTime;
        newResult.resultCount = data.metrics.resultCount;
        newResult.resultSize = data.metrics.resultSize;
        newResult.result = angular.toJson(result, true);
        newResult.data = result;
        newResult.requestID = data.requestID;
        lastResult.copyIn(newResult);

        finishQuery();

//      var post2_ms = new Date().getTime();

//      $timeout(function(){
//      var post3_ms = new Date().getTime();
//      var diff1 = post_post_ms - pre_post_ms;
//      var diff2 = post2_ms - post_post_ms;
//      var diff3 = post3_ms - post2_ms;
//      console.log("Query execution time: " + diff1 + ", processing: " + diff2 + ", rendering: " + diff3);
//      },10);

      })
      .error(function(data, status, headers, config) {
//        console.log("Error Data: " + JSON.stringify(data));
//        console.log("Error Status: " + JSON.stringify(status));
//        console.log("Error Headers: " + JSON.stringify(headers));
//        console.log("Error Config: " + JSON.stringify(config));

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
          lastResult.copyIn(newResult);
          finishQuery();
          return;
        }

        // data is null? query interrupted
        if (data === null) {
          newResult.result = '{"status": "Query interrupted."}';
          newResult.data = {status: "Query interrupted."};
          newResult.status = "errors";
          newResult.resultCount = 0;
          newResult.resultSize = 0;
          lastResult.copyIn(newResult);
          finishQuery();
          return;
        }

        // result is a string? it must be an error message
        if (_.isString(data)) {
          newResult.data = {status: data};
          if (status && status == 504) {
            newResult.data.status_detail =
              "The query workbench only supports queries running for " + timeout +
              " seconds. Use cbq from the command-line for longer running queries. " +
              "Certain DML queries, such as index creation, will continue in the " +
              "background despite the user interface timeout.";
          }

          newResult.result = JSON.stringify(newResult.data,null,'  ');
          newResult.status = "errors";
          lastResult.copyIn(newResult);
          finishQuery();
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
          newResult.resultSize = data.metrics.resultSize;
        }

        if (data.requestID)
          newResult.requestID = data.requestID;

        lastResult.copyIn(newResult);

        finishQuery();
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

    function updateBuckets() {
      if (qwQueryService.gettingBuckets.busy)
        return;

      qwQueryService.gettingBuckets.busy = true;
      qwQueryService.buckets.length = 0;

      // use a query to get buckets with a primary index
      //var queryText = "select distinct indexes.keyspace_id from system:indexes where is_primary = true order by indexes.keyspace_id ;";
      //var queryText2 = "select indexes.keyspace_id, array_agg(index_key) primary_indexes " +
      //"from system:indexes where state = 'online' group by indexes.keyspace_id having array_agg(is_primary) " +
      //"order by indexes.keyspace_id;";

      var queryText =
        "select max(keyspace_id) id, max(has_primary) has_prim, max(has_second) has_sec, max(secondary_indexes) sec_ind from (" +
        " select indexes.keyspace_id, true has_primary" +
        "  from system:indexes where is_primary = true and state = 'online'" +
        "  union" +
        "  select indexes.keyspace_id, true has_second, array_agg(indexes.index_key) secondary_indexes" +
        "  from system:indexes where state = 'online' and is_primary is missing or is_primary = false group by keyspace_id having keyspace_id is not null" +
        "  union" +
        "   select id keyspace_id from system:keyspaces except (select indexes.keyspace_id from system:indexes where state = 'online' union select \"\" keyspace_id)" +
        "  ) foo group by keyspace_id having keyspace_id is not null order by keyspace_id";

      res1 = $http.post("/_p/query/query/service",{statement : queryText})
      .success(function(data, status, headers, config) {

        var bucket_names = [];
        var passwords = [];

        if (data && data.results) for (var i=0; i< data.results.length; i++) {
          var bucket = data.results[i];
          bucket.expanded = false;
          bucket.schema = [];
          bucket_names.push(bucket.id);
          bucket.passwordNeeded = false;
          passwords.push(""); // assume no password for now
          //console.log("Got bucket: " + bucket.id);
          qwQueryService.buckets.push(bucket);
          addToken(bucket.id,"bucket");
        }
        refreshAutoCompleteArray();

        //
        // get the passwords from the REST API (how gross!)
        //

        res1 = $http.get("/pools/default/buckets")
        .success(function(data) {
          //
          // bucket data should be an array of objects, where each object has
          // 'name' and  'saslPassword' fields (amoung much other data)
          //

          if (_.isArray(data)) _.forEach(data, function(bucket, index) {
            if (bucket.name && _.isString(bucket.saslPassword))
              _.forEach(qwQueryService.buckets, function(mBucket, i) {
                if (mBucket.id === bucket.name) {
                  mBucket.password = bucket.saslPassword;
                  return(false);
                }
              });
          });

        });


        qwQueryService.gettingBuckets.busy = false;
      })
      .error(function(data, status, headers, config) {
        var error = "Error retrieving list of buckets";

        if (data && data.errors)
          error = error + ": " + data.errors;
        else if (status)
          error = error + ", contacting query service returned status: " + status;

        qwQueryService.buckets.push({id: error, schema: []});
        qwQueryService.gettingBuckets.busy = false;
      });

    };

    //
    //
    //

    function authenticateBuckets(bucket_names, passwords, onSuccess, onError) {
      $http.post("/authenticate",{bucket : bucket_names, password: passwords})
      .success(onSuccess)
      .error(onError);
    };


    //
    // Get a schema for a given, named bucket.
    //

    function getSchemaForBucket(bucket) {

      if (qwQueryService.gettingBuckets.busy)
        return;

      qwQueryService.gettingBuckets.busy = true;

      var queryText = "infer `" + bucket.id + "`;";
      var queryData = {statement: queryText};
      if (bucket.password)
        queryData.creds = '[{"user":"local:'+bucket.id+'","pass":"' + bucket.password +'"}]';

      return $http.post("/_p/query/query/service",queryData)
      .success(function(data, status, headers, config) {
        //console.log("Done!");
        bucket.schema.length = 0;
        //console.log("Schema status: " + status);
        //console.log("Schema results: " + JSON.stringify(data.results));
        if (data.errors && data.errors[0] && data.errors[0].msg)
          bucket.schema_error = data.errors[0].msg;
        else if (_.isString(data.results))
          bucket.schema_error = data.results;
        else {
          //console.log("Got schema: " + JSON.stringify(data.results));
          bucket.schema = data.results[0];

          var totalDocCount = 0;
          for (var i=0; i<bucket.schema.length; i++)
            totalDocCount += bucket.schema[i]['#docs'];

          getFieldNamesFromSchema(bucket.schema,"");
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

        qwQueryService.gettingBuckets.busy = false;
      })
      .error(function(data, status, headers, config) {
        if (data.errors)
          console.log("Query Error: " + JSON.stringify(data.errors,null,'  '));
        else
          console.log("Query Error: " + status);
        qwQueryService.gettingBuckets.busy = false;
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
    // load state from storage if possible
    //

    loadStateFromStorage();

    //
    // all done creating the service, now return it
    //

    return qwQueryService;
  }



})();
