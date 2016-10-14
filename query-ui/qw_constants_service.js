(function() {

  //
  // the qwConstantsService contains a number of constants used by the query workbench, such as
  // queries, URL prefixes, etc. This version is defined for the regular query workbench inside
  // the Couchbase admin UI, a different version will be defined for CBAS, and for the stand-alone
  // version
  //

  angular.module('qwQuery').factory('qwConstantsService', getQwConstantsService);

  getQwConstantsService.$inject = [];

  function getQwConstantsService() {

    var qwConstantsService = {};

    // do we automatically run queries if the user clicks enter after a semicolon?
    qwConstantsService.autoExecuteQueryOnEnter = true;

    // don't allow multiple queries to run at once
    qwConstantsService.forbidMultipleQueries = true;

    // URL to use for running queries
    qwConstantsService.queryURL = "/_p/query/query/service";

    // should we get passwords from the Couchbase server?
    qwConstantsService.getCouchbaseBucketPasswords = true;

    // should we run 'explain' in the background for each query?
    qwConstantsService.autoExplain = true;

    // allow a suffix to the key used for local storage
    qwConstantsService.localStorageSuffix = "";

    //
    //
    // all done creating the service, now return it
    //

    return qwConstantsService;
  }



})();