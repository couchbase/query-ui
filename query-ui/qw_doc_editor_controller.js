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
    dec.buckets = qwQueryService.bucket_names;

    //
    //
    //

    dec.retrieveDocs = retrieveDocs;
    dec.nextBatch = nextBatch;
    dec.prevBatch = prevBatch;

    dec.clickedOn = function(row) {console.log("clicked on: " + row);};
    dec.updateDoc = updateDoc;
    dec.copyDoc = copyDoc;
    dec.deleteDoc = deleteDoc;
    dec.editDoc = editDoc;

    dec.updatingRow = -1;

    //
    // call the activate method for initialization
    //

    activate();

    //
    // get the next or previous set of documents using paging
    //

    function prevBatch() {
      dec.options.offset -= dec.options.limit;
      if (dec.options.offset < 0)
        dec.options.offset = 0;
      retrieveDocs();
    }

    function nextBatch() {
      dec.options.offset += dec.options.limit;
      retrieveDocs();
    }

    //
    // function to update a document given what the user typed
    //

    function updateDoc(row, makePristine) {
      if (dec.updatingRow >= 0)
        return;

      dec.updatingRow = row;

      //console.log("updating row: " + row);
      var query = "UPSERT INTO `" + dec.options.current_bucket + '` (KEY, VALUE) VALUES ("' +
        dec.options.current_result[row].id + '", ' +
        JSON.stringify(dec.options.current_result[row].data) + ')';
      //console.log("Query: " + query + ", pristine: " + makePristine);

      qwQueryService.executeQueryUtil(query,false)
      // did the query succeed?
      .success(function(data, status, headers, config) {
        //console.log("successfully updated row: " + row + ", makePristine: " + makePristine);
        makePristine();
        dec.updatingRow = -1;
      })

      // ...or fail?
      .error(function (data,status,headers,config) {

        $timeout(retrieveDocs,200);
        var dialogScope = $rootScope.$new(true);
        dialogScope.error_title = "Error Updating Document";
        dialogScope.error_detail = JSON.stringify(data);
        $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
          scope: dialogScope
        });

        //console.log("failed updating row: " + row);
        dec.updatingRow = -1;
      });

    }

    //
    // function to save a document with a different key
    //

    function copyDoc(row, makePristine) {
      if (dec.updatingRow >= 0)
        return;

      // bring up a dialog to get the new key

      var dialogScope = $rootScope.$new(true);

      // default names for save and save_query
      dialogScope.file = {name: dec.options.current_result[row].id + '_copy'};
      dialogScope.header_message = "Save As...";
      dialogScope.body_message = "Enter a key for the new document: ";

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/file_dialog/qw_input_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function (res) {
        dec.updatingRow = row;

        var query = "INSERT INTO `" + dec.options.current_bucket + '` (KEY, VALUE) VALUES ("' +
          dialogScope.file.name + '", ' +
          JSON.stringify(dec.options.current_result[row].data) + ')';
        //console.log("Copying row: " + row + " with query: " + query);
        //console.log("Query: " + query + ", pristine: " + makePristine);

        qwQueryService.executeQueryUtil(query,false)
        // did the query succeed?
        .success(function(data, status, headers, config) {
          //console.log("successfully copied row: " + row);
          dec.updatingRow = -1;
          $timeout(retrieveDocs,200);
        })

        // ...or fail?
        .error(function (data,status,headers,config) {
          //console.log("failed copying row: " + row + JSON.stringify(data));

          $timeout(retrieveDocs,200);
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error Copying Document";
          dialogScope.error_detail = JSON.stringify(data);
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });
          dec.updatingRow = -1;
        });


      });


    }

    //
    // function to delete a document
    //

    function deleteDoc(row) {
      if (dec.updatingRow >= 0)
        return;

      //
      // make sure they really want to do this
      //

      var dialogScope = $rootScope.$new(true);
      dialogScope.error_title = "Are you sure?";
      dialogScope.error_detail = "Really delete the document: " + dec.options.current_result[row].id;
      dialogScope.showCancel = true;

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function (res) {
        dec.updatingRow = row;
        var query = "DELETE FROM `" + dec.options.current_bucket + '` USE KEYS "' +
        dec.options.current_result[row].id + '"';
        //console.log("deleting row: " + row + " with query: " + query);

        qwQueryService.executeQueryUtil(query,false)
        // did the query succeed?
        .success(function(data, status, headers, config) {
          //console.log("successfully deleted row: " + row);
          dec.updatingRow = -1;
          $timeout(retrieveDocs,200);
        })

        // ...or fail?
        .error(function (data,status,headers,config) {

          $timeout(retrieveDocs,200);

          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error Deleting Document";
          dialogScope.error_detail = JSON.stringify(data);
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });

          //console.log("failed deleting row: " + row);
          dec.updatingRow = -1;
        });
      });
    }

    //
    // function to edit the JSON of a document
    //

    function editDoc(row) {
      if (dec.updatingRow >= 0)
        return;

      var dialogScope = $rootScope.$new(true);

      // use an ACE editor for editing the JSON document
      dialogScope.ace_options = {
          mode: 'json',
          showGutter: true,
          useWrapMode: true,
          onLoad: function(_editor) { dialogScope.editor = _editor;},
          $blockScrolling: Infinity
      };
      dialogScope.doc_id = dec.options.current_result[row].id;
      dialogScope.doc_json = JSON.stringify(dec.options.current_result[row].data,null,2);

      // are there any syntax errors in the editor?
      dialogScope.errors = function() {
        if (dialogScope.editor) {
          var annot_list = dialogScope.editor.getSession().getAnnotations();
          if (annot_list && annot_list.length) for (var i=0; i < annot_list.length; i++)
            if (annot_list[i].type == "error")
              return true;
        }
        return false;
      };


      //
      // put up a dialog box with the JSON in it, if they hit SAVE, save the doc, otherwise
      // revert
      //

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/data_display/qw_doc_editor_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function (res) {
        dec.updatingRow = row;
        var newJson = dialogScope.editor.getSession().getValue();

        var query = "UPSERT INTO `" + dec.options.current_bucket + '` (KEY, VALUE) VALUES ("' +
        dec.options.current_result[row].id + '", ' + newJson + ')';
        //console.log("Updating with query: " + query);

        qwQueryService.executeQueryUtil(query,false)
        // did the query succeed?
        .success(function(data, status, headers, config) {
          $timeout(retrieveDocs,200);
          dec.updatingRow = -1;
        })

        // ...or fail?
        .error(function (data,status,headers,config) {

          $timeout(retrieveDocs,200);
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error Updating Document";
          dialogScope.error_detail = JSON.stringify(data);
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });

          dec.updatingRow = -1;
        });
      });
    }

    //
    // build a query from the current options, and get the results
    //

    function retrieveDocs() {
      //console.log("Retrieving docs...");
      qwQueryService.saveStateToStorage();

      // create a query based on either limit/skip or where clause

      // can't do anything without a bucket
      if (!dec.options.selected_bucket || dec.options.selected_bucket.length == 0)
        return;

      // start making a query
      var query = 'select meta().id, * from `' + dec.options.selected_bucket +
        '` data ';

      if (dec.options.where_clause && dec.options.where_clause.length > 0)
        query += 'where ' + dec.options.where_clause;

      if (dec.options.limit && dec.options.limit > 0) {
        query += ' limit ' + dec.options.limit + ' offset ' + dec.options.offset;
      }

      dec.options.current_query = query;
      dec.options.current_bucket = dec.options.selected_bucket;
      dec.options.current_result = [];

      qwQueryService.executeQueryUtil(query,false)

      // did the query succeed?
      .success(function(data, status, headers, config) {
        //console.log("Editor Q Success Data Len: " + JSON.stringify(data.results.length));
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
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error Getting Documents";
          dialogScope.error_detail = dec.options.current_result;
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });
        //console.log("Got error: " + dec.options.current_result);
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
