/**
 * A controller for managing a document editor based on queries
 */

(function() {


  angular.module('qwQuery').controller('qwDocEditorController', docEditorController);

  docEditorController.$inject = ['$rootScope', '$scope', '$uibModal', '$timeout', 'qwQueryService', 'validateQueryService'];

  function docEditorController ($rootScope, $scope, $uibModal, $timeout, qwQueryService, validateQueryService) {

    var dec = this;

    //
    // Do we have a REST API to work with?
    //

    dec.validated = validateQueryService;

    //
    // for persistence, keep some options in the query_service
    //

    dec.options = qwQueryService.doc_editor_options;
    dec.currentDocs = [];
    dec.buckets = qwQueryService.buckets;

    //
    //
    //

    dec.retrieveDocs = retrieveDocs;

    dec.clickedOn = function(row) {console.log("clicked on: " + row);};
    dec.updateDoc = updateDoc;

    //
    // call the activate method for initialization
    //

    activate();

    //
    // function to update a document given what the user typed
    //

    function updateDoc(row) {
      console.log("updating row: " + row);
      console.log("current id: " + dec.options.current_result[row].id);
      console.log("current data: " + JSON.stringify(dec.options.current_result[row].data));

    }

    //
    // build a query from the current options, and get the results
    //

    function retrieveDocs() {
      // create a query based on either limit/skip or where clause

      // can't do anything without a bucket
      if (!dec.options.selected_bucket || dec.options.selected_bucket.length == 0)
        return;

      // start making a query
      var query = 'select meta().id, * from `' + dec.options.selected_bucket.id +
        '` data ';

      if (dec.options.where_clause && dec.options.where_clause.length > 0)
        query += 'where ' + dec.options.where_clause;

      if (dec.options.limit && dec.options.limit > 0) {
        query += ' limit ' + dec.options.limit + ' offset ' + dec.options.offset;
      }

      dec.options.current_query = query;
      dec.options.current_result = [];

      qwQueryService.executeQueryUtil(query,false)

      // did the query succeed?
      .success(function(data, status, headers, config) {
        console.log("Editor Q Success Data Len: " + JSON.stringify(data.results.length));
        //console.log("Editor Q Success Status: " + JSON.stringify(status));

        if (data && data.status && data.status == 'success')
          dec.options.current_result = data.results;
      })

      // ...or fail?
      .error(function (data,status,headers,config) {
        //console.log("Editor Q Error Data: " + JSON.stringify(data));
        //console.log("Editor Q Error Status: " + JSON.stringify(status));

        if (data && data.errors) {
          dec.options.current_result = JSON.stringify(data.errors);
          console.log("Got error: " + dec.options.current_result);
        }
      });

    }

    //
    //
    //

    function activate() {
    }

    //
    // all done, return the controller
    //

    return dec;
  }


})();
