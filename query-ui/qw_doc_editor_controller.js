/**
 * A controller for managing a document editor based on queries
 */

(function() {


  angular.module('qwQuery').controller('qwDocEditorController', docEditorController);

  docEditorController.$inject = ['$rootScope', '$scope', '$http','$uibModal', '$timeout', '$q', '$stateParams', 'qwQueryService', 'validateQueryService'];

  function docEditorController ($rootScope, $scope, $http, $uibModal, $timeout, $q, $stateParams, qwQueryService, validateQueryService) {

    var dec = this;

    //
    // Do we have a REST API to work with?
    //

    dec.validated = validateQueryService;

    //
    // for persistence, keep some options in the query_service
    //

    dec.options = qwQueryService.doc_editor_options;
    dec.options.doc_id = null;
    dec.options.current_result = [];
    dec.currentDocs = [];
    dec.buckets = [];
    dec.use_n1ql = function() {return(validateQueryService.valid())};
    dec.options.show_scrollbars = true;

    //
    //
    //

    dec.retrieveDocs = retrieveDocs;
    dec.createBlankDoc = createBlankDoc;
    dec.nextBatch = nextBatch;
    dec.prevBatch = prevBatch;

    //dec.clickedOn = function(row) {console.log("clicked on: " + row);};
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
      checkUnsavedChanges(function() {
        dec.options.offset -= dec.options.limit;
        if (dec.options.offset < 0)
          dec.options.offset = 0;
        retrieveDocs_inner();
      });
    }

    function nextBatch() {
      // don't fetch data if unsaved changes
      checkUnsavedChanges(function() {
        dec.options.offset += dec.options.limit;
        retrieveDocs_inner();
      });
    }

    //
    // function to update a document given what the user typed
    //

    function updateDoc(row, form) {
      if (dec.updatingRow >= 0)
        return;

      dec.updatingRow = row;

      var newJson = JSON.stringify(dec.options.current_result[row].data);
      var promise = saveDoc(row,newJson);

      // if it succeeded, mark the row as clean
      promise.then(function success() {
        form.$setPristine();
      },
      function error(resp) { // what to do if it fails?
        var data = resp.data, status = resp.status;

        var dialogScope = $rootScope.$new(true);
        dialogScope.error_title = "Error Copying Document";
        dialogScope.error_detail = JSON.stringify(data);
        $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
          scope: dialogScope
        });
       });

      dec.updatingRow = -1;
    }

    //
    // create a blank document
    //

    function createBlankDoc() {
      // bring up a dialog to get the new key

      var dialogScope = $rootScope.$new(true);

      // default names for save and save_query
      dialogScope.file = {name: ''};
      dialogScope.header_message = "Add Document";
      dialogScope.body_message = "New Document ID ";

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/file_dialog/qw_input_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function success(resp) {

        var res = showDocEditor(dialogScope.file.name,'{\n"click": "to edit",\n"with JSON": "there are no reserved field names"\n}');

        res.promise.then(function success(resp) {
          //console.log("saving new doc...");
          var newJson = res.scope.editor.getSession().getValue();
          saveDoc(-1,newJson,res.scope.doc_id).then(function success(res) {
            refreshUnlessUnsaved();
          }, function error(resp) {
            console.log("Error saving doc");;
          });
        });

      });
    }

    //
    // function to save a document with a different key
    //

    function copyDoc(row, form) {
      if (dec.updatingRow >= 0)
        return;

      // bring up a dialog to get the new key

      var dialogScope = $rootScope.$new(true);

      // default names for save and save_query
      dialogScope.file = {name: dec.options.current_result[row].id + '_copy'};
      dialogScope.header_message = "Save As";
      dialogScope.body_message = "New Document Key ";

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/file_dialog/qw_input_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function success(resp) {
        dec.updatingRow = row;

        var promise = saveDoc(row,JSON.stringify(dec.options.current_result[row].data),dialogScope.file.name);

        // did the query succeed?
        promise.then(function success(resp) {
          //console.log("successfully copied form: " + form);
          dec.updatingRow = -1;
          if (!resp.data.errors) {
            form.$setPristine();
            $timeout(refreshUnlessUnsaved,100);
          }
        },

        // ...or fail?
        function error(resp) {
          var data = resp.data, status = resp.status;

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
      dialogScope.error_title = "Delete Document";
      dialogScope.error_detail = "Warning, this will delete the document: " + dec.options.current_result[row].id;

      var promise = $uibModal.open({
        templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
        scope: dialogScope
      }).result;

      promise.then(function success(res) {
        dec.updatingRow = row;

        var promise;
        if (dec.use_n1ql())
          promise = deleteDoc_n1ql(row);
        else
          promise = deleteDoc_rest(row);

        // did the query succeed?
        promise.then(function(resp) {
          //console.log("successfully deleted row: " + row);
          dec.updatingRow = -1;
          dec.options.current_result[row].deleted = true;
        },

        // ...or fail?
        function error(resp) {
          var data = resp.data, status = resp.status;

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

    function deleteDoc_n1ql(row) {
      var query = "DELETE FROM `" + dec.options.current_bucket + '` USE KEYS "' +
      dec.options.current_result[row].id + '"';
      //console.log("deleting row: " + row + " with query: " + query);

      return qwQueryService.executeQueryUtil(query,false);
    }

    function deleteDoc_rest(row) {
      var Url = "../pools/default/buckets/" + encodeURIComponent(dec.options.current_bucket) +
      "/docs/" + encodeURIComponent(dec.options.current_result[row].id);

      return $http({
        method: "DELETE",
        url: Url
      });
    }

    //
    // function to edit the JSON of a document
    //

    function editDoc(row) {
      if (dec.updatingRow >= 0)
        return;

      var res = showDocEditor(dec.options.current_result[row].id, JSON.stringify(dec.options.current_result[row].data,null,2));
      res.promise.then(getSaveDocClosure(res.scope,row));
    }

    //
    // bring up the JSON editing dialog for edit or create new documents
    //

    function showDocEditor(id,json) {
      var dialogScope = $rootScope.$new(true);

      // use an ACE editor for editing the JSON document
      dialogScope.ace_options = {
          mode: 'json',
          showGutter: true,
          useWrapMode: true,
          onLoad: function(_editor) {
            dialogScope.editor = _editor;
            _editor.getSession().on("changeAnnotation", function() {
              var annot_list = _editor.getSession().getAnnotations();
              if (annot_list && annot_list.length) for (var i=0; i < annot_list.length; i++)
                if (annot_list[i].type == "error") {
                  dialogScope.error_message = "Error on row: " + annot_list[i].row + ": " + annot_list[i].text;
                  dialogScope.$applyAsync(function() {});
                  return;
                }
              dialogScope.error_message = null; // no errors found
              dialogScope.$applyAsync(function() {});
            });
            if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
              _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari
          },
          $blockScrolling: Infinity
      };
      dialogScope.doc_id = id;
      dialogScope.doc_json = json;

      // are there any syntax errors in the editor?
      dialogScope.errors = function() {
        if (dialogScope.editor) {
          var annot_list = dialogScope.editor.getSession().getAnnotations();
          if (annot_list && annot_list.length)
            for (var i=0; i < annot_list.length; i++)
              if (annot_list[i].type == "error") {
                return true;
              }
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

      return({scope:dialogScope, promise:promise});
    }

    // need to remember the dialogScope and row in the promise resolution

    function getSaveDocClosure(dialogScope,row) {
      return function(res) {
        var newJson = dialogScope.editor.getSession().getValue();
        saveDoc(row,newJson);
        refreshUnlessUnsaved();
      }
    }

    //
    // functions to save the document back to the server
    //

    function saveDoc(row,newJson,newKey) {
      dec.updatingRow = row;

      var promise;

      if (dec.use_n1ql())
        promise = saveDoc_n1ql(row,newJson,newKey);
      else
        promise = saveDoc_rest(row,newJson,newKey);

      promise
      // did the query succeed?
      .then(function(resp) {
        var data = resp.data, status = resp.status;
        if (data.errors) {
          handleSaveFailure(newKey,data.errors);
        }

        dec.updatingRow = -1;
      },

      // ...or fail?
      function error(resp) {
        handleSaveFailure(newKey,resp.data);
        dec.updatingRow = -1;
      });

      return(promise);
    }

    //
    // show dialog with error message about save failure
    //

    function handleSaveFailure(newKey,errors) {
        var dialogScope = $rootScope.$new(true);
        if (newKey)
          dialogScope.error_title = "Error Inserting New Document";
        else
          dialogScope.error_title = "Error Updating Document";
        dialogScope.error_detail = JSON.stringify(errors);
        dialogScope.hide_cancel = true;
        $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
          scope: dialogScope
        });
    }


    //
    // save the document if we have a query service
    //

    function saveDoc_n1ql(row,newJson,newKey) {
      var query;
      if (newKey)
        query = "INSERT INTO `" + dec.options.current_bucket + '` (KEY, VALUE) VALUES ("' +
        newKey + '", ' + newJson + ')';
      else
        query = "UPSERT INTO `" + dec.options.current_bucket + '` (KEY, VALUE) VALUES ("' +
        dec.options.current_result[row].id + '", ' + newJson + ')';

      //console.log("Updating with query: " + query);

      return qwQueryService.executeQueryUtil(query,false);
    }


    function saveDoc_rest(row,newJson,newKey) {
      var Url = "/pools/default/buckets/" + encodeURIComponent(dec.options.current_bucket) +
      "/docs/" + (newKey ? newKey : encodeURIComponent(dec.options.current_result[row].id));


      // with newKey, we need to check if the document exists first by that key

      if (newKey) {
        return $http({
          method: "GET",
          url: Url
        }).then(function success(resp) {
          return($q.reject({data: "Can't save document, key '" + newKey + "' already exists."}));
        },
        function fail(resp) {
          return $http({
            method: "POST",
            url: Url,
            data: {
              flags: 0x02000006,
              value: newJson
            }
          });
        });
      }

      // otherwise just save the doc using the REST api
      else return $http({
        method: "POST",
        url: Url,
        data: {
          flags: 0x02000006,
          value: newJson
        }
      });
    }

    //
    // warn the user about unsaved changes, if any
    //

    function checkUnsavedChanges(ifOk,ifCancel) {
      // warn the user if they try to get more data when unsaved changes
      if ($('#somethingChangedInTheEditor')[0]) {
        var dialogScope = $rootScope.$new(true);
        dialogScope.error_title = "Warning: Unsaved Changes";
        dialogScope.error_detail = "You have unsaved changes. Continue and lose them?";

        var promise = $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
          scope: dialogScope
        }).result;

        // they clicked yes, so go ahead
        promise.then(function success() {
          ifOk();
        },function cancel() {if (ifCancel) ifCancel();});
      }
      // if there are no unsaved changes, just go ahead
      else
        ifOk();
    }
    //
    // build a query from the current options, and get the results
    //

    dec.options.queryBusy = false;

    function retrieveDocs() {
      checkUnsavedChanges(retrieveDocs_inner);
    }

    function retrieveDocs_inner() {
      qwQueryService.saveStateToStorage();

      if (dec.use_n1ql())
        retrieveDocs_n1ql();
      else
        retrieveDocs_rest();
    }


    function retrieveDocs_n1ql() {
      if (dec.options.queryBusy) // don't have 2 retrieves going at once
        return;

      //console.log("Retrieving docs via N1QL...");

      // create a query based on either limit/skip or where clause

      // can't do anything without a bucket
      if (!dec.options.selected_bucket || dec.options.selected_bucket.length == 0)
        return;

      // start making a query
      var query = 'select meta().id, meta() meta, * from `' + dec.options.selected_bucket +
      '` data ';

      if (dec.options.where_clause && dec.options.where_clause.length > 0)
        query += 'where ' + dec.options.where_clause;

      if (dec.options.limit && dec.options.limit > 0) {
        query += ' limit ' + dec.options.limit + ' offset ' + dec.options.offset;
      }

      dec.options.current_query = query;
      dec.options.current_bucket = dec.options.selected_bucket;
      dec.options.current_result = [];

      dec.options.queryBusy = true;
      qwQueryService.executeQueryUtil(query,false)

      // did the query succeed?
      .then(function success(resp) {
        var data = resp.data, status = resp.status;

        //console.log("Editor Q Success Data Len: " + JSON.stringify(data.results.length));
        //console.log("Editor Q Success Status: " + JSON.stringify(status));

        if (data && data.status && data.status == 'success')
          dec.options.current_result = data.results;

        dec.options.queryBusy = false;
        //console.log("Current Result: " + JSON.stringify(dec.options.current_result));
      },

      // ...or fail?
      function error(resp) {
        var data = resp.data, status = resp.status;
        //console.log("Editor Q Error Data: " + JSON.stringify(data));
        //console.log("Editor Q Error Status: " + JSON.stringify(status));

        if (data && data.errors) {
          dec.options.current_result = JSON.stringify(data.errors);
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error with document retrieval query.";
          var errorText = "";
          for (var i=0; i< data.errors.length; i++)
            errorText += "Code: " + data.errors[i].code + ', Message: "' + data.errors[i].msg + '"    \n';
          console.log("Got errors: " + JSON.stringify(data.errors));
          dialogScope.error_detail = errorText;
          dialogScope.hide_cancel = true;
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });

          //console.log("Got error: " + dec.options.current_result);
        }
        dec.options.queryBusy = false;
      });

    }

    //
    // get the documents using the REST API
    //

    function retrieveDocs_rest() {

      if (dec.options.queryBusy) // don't have 2 retrieves going at once
        return;

      //console.log("Retrieving docs via REST...");

      dec.options.current_query = dec.options.selected_bucket;

      if (dec.options.doc_id)
        dec.options.current_query += ', document id: ' + dec.options.doc_id;

      else
        dec.options.current_query += ", limit: " +
          dec.options.limit + ", offset: " + dec.options.offset;

      // get the stats from the Query service
      dec.options.queryBusy = true;
      dec.options.current_result = [];
      var rest_url;

      // we use a different URL if they specified a doc_id
      if (dec.options.doc_id && dec.options.doc_id.length)
        rest_url = "../pools/default/buckets/" + dec.options.selected_bucket +
          "/docs/" + dec.options.doc_id;
      else
        rest_url = "../pools/default/buckets/" + dec.options.selected_bucket +
          "/docs?skip=" + dec.options.offset + "&include_docs=true&limit=" +
          dec.options.limit;

      $http({
        url: rest_url,
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data) {
          dec.options.current_bucket = dec.options.selected_bucket;

          var data = resp.data;

          //console.log("Got REST results: " + JSON.stringify(data));

          //console.log(JSON.stringify(data));
          dec.options.current_result.length = 0;
          // did we get a single doc back?
          if (data && data.json && data.meta) {
            data.meta.type = "json";
            dec.options.current_result.push({id: data.meta.id, data: data.json, meta: data.meta});
          }

          // maybe a single binary doc?
          else if (data && data.meta && data.base64 === "") {
            data.meta.type = "base64";
            dec.options.current_result.push({id: data.meta.id, base64: data.base64, meta: data.meta});
          }

          // or maybe an array of docs?
          else if (data && data.rows)
            for (var i=0; i< data.rows.length; i++) {
              // is it binary or json data?
              if (data.rows[i].doc.json)
                dec.options.current_result.push(
                    {id: data.rows[i].id, data: data.rows[i].doc.json, meta: {id: data.rows[i].id, type: "json"}});
              else if (data.rows[i].doc.base64 === "")
                dec.options.current_result.push(
                    {id: data.rows[i].id, meta: {id: data.rows[i].id, type: "base64"}});
            }

          dec.options.queryBusy = false;
          //console.log("Current Result: " + JSON.stringify(dec.options.current_result));
        }
      },function error(resp) {
        var data = resp.data, status = resp.status;
        //console.log("Got REST error status: " + status + ", data: " + JSON.stringify(data));

        if (data && data.errors) {
          dec.options.current_result = JSON.stringify(data.errors);
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error with document retrieval.";
          dialogScope.error_detail = dec.options.current_result;
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });
        }

        dec.options.queryBusy = false;
      });

    }


    //
    // get a list of buckets from the server, either through N1QL or the REST API
    //

    function getBuckets() {
      if (dec.use_n1ql())
        return getBuckets_n1ql();
      else
        return getBuckets_rest();
    }

    function getBuckets_n1ql() {
      var bucketList = validateQueryService.validBuckets();
      dec.buckets.length = 0;
      for (var i=0; i < bucketList.length; i++) if (bucketList[i] != ".")
        dec.buckets.push(bucketList[i]);

      //console.log("Got buckets1: " + JSON.stringify(dec.buckets));
    }

    function getBuckets_rest() {

      // get the buckets from the REST API
      var promise = $http({
        url: "../pools/default/buckets/",
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data) {
          // get the bucket names
          dec.buckets.length = 0;
          for (var i=0; i < resp.data.length; i++) if (resp.data[i])
            dec.buckets.push(resp.data[i].name);
        }
        //console.log("Got buckets2: " + JSON.stringify(dec.buckets));

      },function error(resp) {
        var data = resp.data, status = resp.status;

        if (data && data.errors) {
          dec.options.current_result = JSON.stringify(data.errors);
          var dialogScope = $rootScope.$new(true);
          dialogScope.error_title = "Error getting list of documents.";
          dialogScope.error_detail = dec.options.current_result;
          $uibModal.open({
            templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
            scope: dialogScope
          });
        }
      });

      return(promise);
    }

    function handleBucketParam() {
      if (_.isString($stateParams.bucket) && $stateParams.bucket.length > 0) {
        //console.log("Selecting bucket: " + $stateParams.bucket + " from bucket list: " +
        //    JSON.stringify(dec.buckets));
        dec.options.selected_bucket = $stateParams.bucket;
        dec.options.where_clause = ''; // reset the where clause
        dec.options.offset = 0; // start off from the beginning
        $timeout(retrieveDocs_inner,50);
      }
    }

    //
    // if the user updates something, we like to refresh the results, unless
    // there are unsaved changes
    //

    function refreshUnlessUnsaved() {

      // if nothing else on screen is dirty, refresh
      if (!$('#somethingChangedInTheEditor')[0]) {
        retrieveDocs_inner();
      }
      // otherwise let the user know that updates are not yet visible
      else {
        var dialogScope = $rootScope.$new(true);
        dialogScope.error_title = "Info";
        dialogScope.error_detail = "Because you have unsaved document edits, some changes won't be shown until you retrieve docs.";
        dialogScope.hide_cancel = true;

        var promise = $uibModal.open({
          templateUrl: '../_p/ui/query/ui-current/password_dialog/qw_query_error_dialog.html',
          scope: dialogScope
        }).result;

      }
    }

    //
    // when we activate, check with the query service to see if we have a query node. If
    // so, we can use n1ql, if not, use the regular mode.
    //

    function activate() {
      //getBuckets(); // for some reason this extra call is needed, otherwise the menu doesn't populate

      //console.log("Activating DocEditor, got buckets.")

      // see if we have access to a query service
      validateQueryService.getBucketsAndNodes(function() {
        //console.log("Query service callback, getting ready to handle bucket param: " + $stateParams.bucket);

        var promise = getBuckets();

        // wait until after the buckets are retrieved to set the bucket name, if it was passed to us
        if (promise)
          promise.then(handleBucketParam);
        else {
          handleBucketParam();
        }
      });

    }

    //
    // all done, return the controller
    //

    return dec;
  }


})();
