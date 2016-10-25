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
    qwConstantsService.autoExecuteQueryOnEnter = false;

    // don't allow multiple queries to run at once
    qwConstantsService.forbidMultipleQueries = false;

    // URL to use for running queries
    qwConstantsService.queryURL = "/_p/query/query/service";

    // should we get passwords from the Couchbase server?
    qwConstantsService.getCouchbaseBucketPasswords = false;

    // should we run 'explain' in the background for each query?
    qwConstantsService.autoExplain = false;

    // should we show the bucket analysis pane at all?
    qwConstantsService.showBucketAnalysis = true;

    // allow a suffix to the key used for local storage
    qwConstantsService.localStorageSuffix = "";

    // query language mode for ACE editor
    qwConstantsService.queryMode = 'sql-plus-plus';

    // should queries include an array of credentials? ("creds")
    qwConstantsService.sendCreds = false;

    // the following query asks Couchbase for a list of keyspaces, returning the 'id',
    // and a 'has_prim' boolean indicating whether or not it has a primary index, and
    // 'has_sec' indicating secondary indexes. For a different system, just make sure
    // the returned schema has 'id' and 'has_prim'.
    qwConstantsService.keyspaceQuery =
      "select BucketName as id, true as has_prim from Metadata.`Bucket` union all " +
      "select DatasetName as id, true as has_sec from Metadata.`Dataset` where BucketName is not missing;";     
    
    // should we permit schema inquiries in the bucket analysis pane?
    qwConstantsService.showSchemas = false;
    
    // labels for different types of buckets in the analysis pane
    qwConstantsService.fullyQueryableBuckets = "Buckets";
    qwConstantsService.queryOnIndexedBuckets = "Shadow Data Sets";
    qwConstantsService.nonIndexedBuckets = "";
    
    
    //
    //
    //
    // all done creating the service, now return it
    //

    return qwConstantsService;
  }



})();