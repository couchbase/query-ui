import {MnLifeCycleHooksToStream} from '/ui/app/mn.core.js';

import {Component, ChangeDetectorRef, ViewEncapsulation} from '/ui/web_modules/@angular/core.js';
import {FormControl, FormGroup}                          from '/ui/web_modules/@angular/forms.js';
import {UIRouter}                                        from '/ui/web_modules/@uirouter/angular.js';
import js_beautify                                       from "/ui/web_modules/js-beautify.js";
import _                                                 from "/ui/web_modules/lodash.js";

import {MnPermissions, MnPoolDefault}                    from '/ui/app/ajs.upgraded.providers.js';

import { Subject } from '/ui/web_modules/rxjs.js';

import {QwCollectionsService}   from '../angular-services/qw.collections.service.js';
import {QwFixLongNumberService} from "/_p/ui/query/angular-services/qw.fix.long.number.service.js";
import {QwQueryService}         from "/_p/ui/query/angular-services/qw.query.service.js";
import {QwValidateQueryService} from "/_p/ui/query/angular-services/qw.validate.query.service.js";
import {$http}                  from '/_p/ui/query/angular-services/qw.http.js';

import {QwDialogService}        from '../angular-directives/qw.dialog.service.js';

export {QwDocumentsComponent};

class QwDocumentsComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        templateUrl: "/_p/ui/query/angular-components/qw.documents.html",
        styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
        encapsulation: ViewEncapsulation.None,
//        changeDetection: ChangeDetectionStrategy.OnPush
      })
    ]
  }

  static get parameters() {
    return [
      ChangeDetectorRef,
      MnPermissions,
      MnPoolDefault,
      QwCollectionsService,
      QwDialogService,
      QwFixLongNumberService,
      QwQueryService,
      QwValidateQueryService,
      UIRouter,
      $http
    ];
  }

  ngOnInit() {
    var params = this.uiRouter.globals.params;
    if (params.bucket) {
      this.dec.options.offset = 0;
      this.dec.options.selected_bucket = params.bucket;
      if (params.scope)
        this.dec.options.selected_scope = params.scope;
      if (params.collection)
        this.dec.options.selected_collection = params.collection;
    }

    this.formOptions = {
      limit: this.dec.options.limit,
      offset: this.dec.options.offset,
      doc_id: this.dec.options.doc_id,
      doc_id_start: this.dec.options.doc_id_start,
      doc_id_end: this.dec.options.doc_id_end,
      where_clause: this.dec.options.where_clause,
    };
    this.searchForm.setValue(this.formOptions);

    var This = this;
    this.searchForm.get('limit').valueChanges.subscribe(data => This.dec.options.limit = data);
    this.searchForm.get('offset').valueChanges.subscribe(data => This.dec.options.offset = data);
    this.searchForm.get('doc_id').valueChanges.subscribe(data => This.dec.options.doc_id = data);
    this.searchForm.get('doc_id_start').valueChanges.subscribe(data => This.dec.options.doc_id_start = data);
    this.searchForm.get('doc_id_end').valueChanges.subscribe(data => This.dec.options.doc_id_end = data);
    this.searchForm.get('where_clause').valueChanges.subscribe(data => This.dec.options.where_clause = data);
  }

  ngAfterInit() {
    //console.log("Docs afterInit");
  }

  constructor(
    changeDetectorRef,
    mnPermissions,
    mnPoolDefault,
    qwCollectionsService,
    qwDialogService,
    qwFixLongNumberService,
    qwQueryService,
    validateQueryService,
    uiRouter,
    $http) {
    super();

    var dec = {};
    this.dec = dec;
    dec.rbac = mnPermissions.export;
    dec.compat = mnPoolDefault.export.compat;
    dec.docViewer = function() {
      return dec.rbac.cluster.collection['.:.:.'].data.docs.read &&
      dec.rbac.cluster.collection['.:.:.'].collections.read;
    };
    dec.searchForm = this.searchForm;

    this.uiRouter = uiRouter;

    // form for selecting documents
    this.searchForm = new FormGroup({
      limit: new FormControl(10),
      offset: new FormControl(0),
      doc_id: new FormControl(),
      doc_id_start: new FormControl(),
      doc_id_end: new FormControl(),
      where_clause: new FormControl()
    });

    dec.searchForm = this.searchForm;

    //
    // Do we have a REST API to work with?
    //

    dec.validated = validateQueryService;

    //
    // for persistence, keep some options in the query_service
    //

    dec.options = qwQueryService.doc_editor_options;
    dec.options.doc_id = null;
    dec.options.doc_id_start = null;
    dec.options.doc_id_end = null;
    dec.options.current_result = [];
    dec.options.config_subject = new Subject();
    dec.options.config_notify = function() {
      dec.options.config_subject.next();
    };
    dec.show_results = true;
    dec.currentDocs = [];
    dec.buckets = [];
    dec.buckets_ephemeral = {};
    dec.indexes = {};
    dec.show_id = show_id;
    dec.hideAllTooltips = true;
    dec.resultSize = function () {
      if (_.isArray(dec.options.current_result))
        return dec.options.current_result.length;
      else return null;
    };

    dec.how_to_query = how_to_query;
    dec.can_use_n1ql = can_use_n1ql;
    dec.has_indexes = has_indexes;

    // wheneverthe collection menu is changed, remove any 'where' clause and offset
    dec.collectionMenuCallback = function(event) {
      //console.log("collectionMenuCallback: " + JSON.stringify(event));
      if (event && (dec.options.selected_bucket != event.bucket || dec.options.selected_scope != event.scope ||
        dec.options.selected_collection != event.collection))
      {
        dec.options.selected_bucket = event.bucket;
        dec.options.selected_scope = event.scope;
        dec.options.selected_collection = event.collection;
        dec.searchForm.get('where_clause').setValue('');
        dec.searchForm.get('offset').setValue(0);

        if (event.bucket && event.scope && event.collection)
          retrieveDocs_inner();
      }
    };

    // MB-40706 - reset offset when WHERE clause changed
    dec.where_changed = function() {
      dec.searchForm.get('offset').setValue(0);
    };

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

    var N1QL = "N1QL";
    var KV = "KV";

    var largeDoc = 1024 * 1024;

    //
    // can we add a new document? only if collection selected and permissions
    //

    dec.can_add_document = function() {
      if (!dec.options.selected_collection)
        return false;
      else
        // TODO - need to check permissions on selected collection
        return true;
    };

    //
    // call the activate method for initialization
    //

    activate();

    // how to get the documents?
    //
    // we have two options: N1QL and the KV REST API.
    //
    // the N1QL approach is only available if we have a query service.
    // the KV approach doesn't work well for ephemeral buckets.
    // in some cases, neither work.
    //
    // We have several types of query:
    // - single key lookup - use KV
    // - key range lookup - if primary index, use N1QL, otherwise KV, fail if ephemeral bucket
    // - limit/offset - if primary index, use N1QL, otherwise KV, fail if ephemeral
    // - limit/offset with WHERE clause - if primary or secondary index
    //
    // In some cases, nothing works (such as a Limit/Offset query on an
    // ephemeral bucket with no indexes).
    //

    function how_to_query() {
      // make sure that there is a current bucket selected
      if (!dec.options.selected_bucket) {
        dec.options.current_result = "No bucket selected.";
        return (false);
      }

      if (dec.compat.atLeast70 && !dec.options.selected_scope) {
        dec.options.current_result = "No scope selected.";
        return (false);
      }

      if (dec.compat.atLeast70 && !dec.options.selected_collection) {
        dec.options.current_result = "No collection selected.";
        return (false);
      }

      // do we have any buckets?
      if (dec.buckets.length == 0) {
        dec.options.current_query = dec.options.selected_bucket;
        dec.options.current_result = "No buckets found.";
        return (false);
      }

      // always use KV for single doc lookups by ID
      if (dec.options.show_id && dec.options.doc_id)
        return KV;

      // key range lookup or limit/offset with no WHERE clause
      // - use N1QL if primary index, otherwise KV (though fail if ephemeral)
      if ((!dec.options.show_id && (dec.options.doc_id_start || dec.options.doc_id_end)) || dec.options.where_clause.length == 0) {
        if (has_prim())
          return (N1QL);
        else if (dec.buckets_ephemeral[dec.options.selected_bucket]) { // ephemeral, no primary key
          dec.options.current_result =
            "Ephemeral buckets can only be queried by document ID, or via a primary or secondary GSI index.";
          refreshResults();
          return (false);
        } else
          return (KV);
      }

      // limit/offset with WHERE clause
      // must have primary or secondary index, otherwise error message

      if (dec.options.where_clause.length > 0) {
        if (!has_prim() && !has_sec()) {
          dec.options.current_result = "WHERE clause not supported unless bucket has primary or secondary index.";
          return (false);
        }
        return (N1QL);
      }

      // shouldn't get here
      dec.options.current_result = "Internal error running document query.";
      return (false);
    }

    //
    // is it possible to use_n1ql?
    // need a query service, and some index for the current bucket
    //

    function can_use_n1ql() {
      return (has_prim() || has_sec());
    }

    //
    // get the next or previous set of documents using paging
    //

    function prevBatch() {
      checkUnsavedChanges(function () {
        dec.options.offset -= dec.options.limit;
        if (dec.options.offset < 0)
          dec.options.offset = 0;
        dec.searchForm.get('offset').setValue(dec.options.offset);
        retrieveDocs_inner();
      });
    }

    function nextBatch() {
      // don't fetch data if unsaved changes
      checkUnsavedChanges(function () {
        dec.options.offset += dec.options.limit;
        dec.searchForm.get('offset').setValue(dec.options.offset);
        retrieveDocs_inner();
      });
    }

    //
    // trigger the
    //
    function refreshResults() {
      dec.options.config_notify();
    }

    //
    // handle switch between a single ID and a range of IDs
    //

    function show_id(val) {
      dec.options.show_id = val;
      // if they typed something in the where_clause, clear out the id values,
      // since they can't do both
      if (val && dec.options.where_clause.length > 0)
        dec.options.doc_id = '';
      if (!val && dec.options.where_clause.length > 0) {
        dec.options.doc_id_start = '';
        dec.options.doc_id_end = '';
      }
    }

    //
    // function to update a document given what the user typed
    //

    function updateDoc(row, form) {
      if (dec.updatingRow >= 0)
        return;

      dec.updatingRow = row;

      var newJson = JSON.stringify(dec.options.current_result[row].data);
      update_display_json(row, newJson);
      var promise = saveDoc(row, newJson);

      // if it succeeded, mark the row as clean
      promise.then(function success() { // errors are handled by saveDoc()
        form.form.markAsPristine();
        refreshResults();
        dec.updatingRow = -1;
      });
    }

    //
    // create a blank document
    //

    function createBlankDoc() {
      // bring up a dialog to get the new key
      showNewDocEditor('',
        '{\n"click": "to edit",\n"with JSON": "there are no reserved field names"\n}');
    }

    //
    // show a doc editor dialog for a new document, and if the user clicks 'o.k.' then
    // save it, though if the ID is already taken, give them another change at the ID
    //

    function showNewDocEditor(id, json) {
      qwDialogService.showDocEditorDialog(false, 'Create New Document', id, json, '', true)
        .then(function ok(result) {
            var newJson = result.json;
            // reformat the doc for compactness
            newJson = js_beautify(newJson, {
              "indent_size": 0,
              "eol": "",
              "remove_space_before_token": true,
              "indent_char": ""
            });
            saveDoc(-1, newJson, result.id, true)
              .then(setTimeout(refreshUnlessUnsaved, 100),
                function saveFailed(resp) {
                  handleSaveFailure(result.id, resp.data) // key already used,try again?
                    .then(function () {
                      showNewDocEditor(result.id, result.json);
                    });
                });
          },
          function cancel() {
          });
    }

    //
    // function to save a document with a different key
    //

    function copyDoc(row, form) {
      if (dec.updatingRow >= 0)
        return;

      var json = dec.options.current_result[row].rawJSON || JSON.stringify(dec.options.current_result[row].data,null,2);

      // bring up a dialog with a copy of the doc, and a new id
      showNewDocEditor(dec.options.current_result[row].id + '_copy', json);
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

      hideTooltips();
      var promise = showErrorDialog("Delete Document",
        "Warning, this will delete the document: " + dec.options.current_result[row].id);
      promise.then(allowTooltips, allowTooltips); // allow tooltips to show again

      promise.then(function ok(res) {
          dec.updatingRow = row;

          var promise = deleteDoc_rest(row);

          // did the query succeed?
          promise.then(function (resp) {
              //console.log("successfully deleted row: " + row);
              dec.updatingRow = -1;
              dec.options.current_result[row].deleted = true;
              refreshResults();
            },

            // ...or fail?
            function error(resp) {
              var data = resp.data, status = resp.status;
              var error = resp.error ? JSON.stringify(resp.error) :
                "Status: " + resp.status + " " + resp.statusText;

              showErrorDialog("Error Deleting Document", error, true)
                .then(function () {
                  dec.updatingRow = -1;
                });
            });
        },
        function cancel(res) {/*need to handle when user clicks cancel*/
        });
    }

    function deleteDoc_rest(row) {
      var Url = get_base_url() +
        "/docs/" + myEncodeURIComponent(dec.options.current_result[row].id);

      return $http.delete(Url, {method: "DELETE", url: Url});
    }

    //
    // function to edit the JSON of a document
    //

    function editDoc(row, readonly) {
      if (dec.updatingRow >= 0)
        return;

      var doc_string;

      // if we have raw JSON with long numbers, let the user edit that
      if (dec.options.current_result[row].rawJSON)
        doc_string = js_beautify(dec.options.current_result[row].rawJSON, {"indent_size": 2});

      // for binary docs, base64
      else if (dec.options.current_result[row].meta.type === "base64")
        doc_string = JSON.stringify(dec.options.current_result[row].base64);

      // handle empty documents
      else if (!dec.options.current_result[row].data)
        doc_string = "";

      // otherwise create a string from the underlying data
      else
        doc_string = JSON.stringify(dec.options.current_result[row].data, null, 2);

      var doc_id = dec.options.current_result[row].id;
      var meta_obj = {
        meta: dec.options.current_result[row].meta,
        xattrs: dec.options.current_result[row].xattrs
      };
      var meta_str = JSON.stringify(meta_obj, null, 2);

      qwDialogService.showDocEditorDialog(readonly, (readonly?'View Document':'Edit Document'), doc_id, doc_string, meta_str)
        .then(function ok(result) {
          // reformat the doc for compactness, but only if no long numbers present
          result.json = js_beautify(result.json, {
            "indent_size": 0,
            "eol": "",
            "remove_space_before_token": true,
            "indent_char": ""
          });
          saveDoc(row, result.json).then(refreshUnlessUnsaved(result.json.length));
        }, function cancel(res) {/*nothing to do, but need to catch*/
        });


      //var res = showDocEditor(dec.options.current_result[row].id, doc_string,meta_str,readonly);
      //res.promise.then(getSaveDocClosure(res.scope,row));
    }

    function hideTooltips() {
      dec.hideAllTooltips = true;
    }

    function allowTooltips() {
      dec.hideAllTooltips = false;
    }

    //
    // functions to save the document back to the server
    //

    function saveDoc(row, newJson, newKey, ignore_errors) {
      dec.updatingRow = row;

      var promise = saveDoc_rest(row, newJson, newKey);

      promise
        // did the query succeed?
        .then(function (resp) {
            var data = resp.data, status = resp.status;
            if (data.errors && !ignore_errors) { // even 'success' can have error status
              handleSaveFailure(newKey, data.errors);
              dec.updatingRow = -1;
            }

            dec.updatingRow = -1;
          },

          // ...or fail?
          function error(resp) {
            if (ignore_errors)
              return;

            var errors = resp;
            if (resp.errors)
              errors = resp.errors;
            else if (resp.data)
              errors = resp.data;

            handleSaveFailure(newKey, errors);
            dec.updatingRow = -1;
          });

      return (promise);
    }

    //
    // show dialog with error message about save failure
    //

    function handleSaveFailure(newKey, errors) {
      var title = newKey ? "Error Inserting New Document" : "Error Updating Document";

      return showErrorDialog(title, 'Errors from server: ' + JSON.stringify(errors), true);
    }


    function saveDoc_rest(row, newJson, newKey) {
      var Url = get_base_url() +
        "/docs/" + (newKey ? myEncodeURIComponent(newKey) : myEncodeURIComponent(dec.options.current_result[row].id));

      if (newJson.length > largeDoc) {
        showErrorDialog("Warning: large documents.",
          'You are saving a very large document, ' + Math.round(10 * newJson.length / (1024 * 1024)) / 10 +
          'MB, it may take some time for the change to be visible in the database.', true);
      }

      // with newKey, we need to check if the document exists first by that key

      if (newKey) {
        return $http.do({
          method: "GET",
          url: Url
        }).then(function success(resp) {
            return (Promise.reject({data: "Can't save document, key '" + newKey + "' already exists."}));
          },
          function fail(resp) {
            return $http.do({
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
      else return $http.do({
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

    function checkUnsavedChanges(ifOk, ifCancel) {
      // warn the user if they try to get more data when unsaved changes
      if (document.getElementById('somethingChangedInTheEditor')) {

        var promise = showErrorDialog("Warning: Unsaved Changes", "You have unsaved changes. Continue and lose them?", false);

        // they clicked yes, so go ahead
        promise.then(function success() {
          ifOk();
        }, function cancel() {
          if (ifCancel) ifCancel();
        });
      }
      // if there are no unsaved changes, just go ahead
      else
        ifOk();
    }

    //
    // build a query from the current options, and get the results
    //

    dec.options.queryBusy = false;

    function markBusy(busy) {
      dec.options.queryBusy = busy;
      refreshResults();
    }

    function retrieveDocs() {
      checkUnsavedChanges(retrieveDocs_inner);
    }

    function retrieveDocs_inner() {
      // if we're already showing top keys, go back to regular docs
      if (dec.options.showTopKeys)
        dec.options.showTopKeys = false;

      qwQueryService.saveStateToStorage();

      // special case - when first loading the page, the QueryService may not have gotten all
      // the bucket information yet. If we want to use n1ql, but can't do so yet, put up a message
      // asking the user to click "retrieve"

      if (validateQueryService.valid() &&
        (dec.options.where_clause || dec.buckets_ephemeral[dec.options.selected_bucket]) &&
        !qwQueryService.buckets.length) { // no bucket info yet
        dec.options.current_query = dec.options.selected_bucket;
        dec.options.current_result = "Connection to query service not quite ready. Click 'Retrieve Docs' to see data.";
        refreshResults();
        return;
      }

      // validate fields
      if (!_.isNumber(dec.options.limit) || dec.options.limit < 1 || dec.options.limit > 200) {
        dec.options.current_result = "Invalid value for 'limit': Limit must be a number between 1 and 200";
        refreshResults();
        return;
      }

      if (!_.isNumber(dec.options.offset) || dec.options.offset < 0) {
        dec.options.current_result = "Invalid value for 'offset': Offset must be a number >= 0";
        refreshResults();
        return;
      }

      if (!_.isString(dec.options.selected_bucket) || dec.options.selected_bucket == "") {
        dec.options.current_result = "No selected bucket.";
        refreshResults();
        return;
      }

      // use n1ql service if we can
      //console.log("Querying via: " + how_to_query());
      switch (how_to_query()) {
        case N1QL:
          retrieveDocs_n1ql();
          break;
        case KV:
          retrieveDocs_rest();
          break;
        case false: // error status
          showErrorDialog("Document Error", dec.options.current_result, true);
          dec.options.current_query = dec.options.selected_bucket;
          break;
      }
    }


    function retrieveDocs_n1ql() {
      if (dec.options.queryBusy) // don't have 2 retrieves going at once
        return;

      //console.log("Retrieving docs via N1QL...");

      // create a query based on either limit/skip or where clause

      // can't do anything without a bucket, scope, and collection
      if (!dec.options.selected_bucket ||
        (dec.compat.atLeast70 && (!dec.options.selected_scope || !dec.options.selected_collection)))
        return;

      // start making a query that only returns doc IDs
      var query = 'select meta().id from `' + dec.options.selected_bucket;
      // no scopes/collections for mixed clusters
      if (dec.options.selected_scope)
        query += '`.`' + dec.options.selected_scope + '`.`' + dec.options.selected_collection;
      query += '` data ';

      if (dec.options.where_clause && dec.options.where_clause.length > 0)
        query += 'where ' + dec.options.where_clause;
      else if (!dec.options.show_id && (dec.options.doc_id_start || dec.options.doc_id_end)) {
        if (dec.options.doc_id_start && dec.options.doc_id_end)
          query += 'where meta().id >= "' + dec.options.doc_id_start + '" and meta().id <= "' + dec.options.doc_id_end + '"';
        else if (dec.options.doc_id_start)
          query += 'where meta().id > "' + dec.options.doc_id_start + '"';
        else
          query += 'where meta().id < "' + dec.options.doc_id_end + '"';
      }

      query += ' order by meta().id ';

      if (dec.options.limit && dec.options.limit > 0) {
        query += ' limit ' + dec.options.limit + ' offset ' + dec.options.offset;
      }

      dec.options.current_query = query;
      dec.options.current_result = [];

      markBusy(true);
      qwQueryService.executeQueryUtil(query, true)

        // did the query succeed?
        .then(function success(resp) {
            var data = resp.data, status = resp.status;

            //console.log("Editor Q Success Data: " + JSON.stringify(data.results));
            //console.log("Editor Q Success Status: " + JSON.stringify(status));

            dec.options.current_result = [];
            var idArray = [];

            for (var i = 0; i < data.results.length; i++)
              idArray.push(data.results[i].id);

            // we get a list of document IDs, create an array and retrieve detailed docs for each
            if (data && data.status && data.status == 'success') {
              getDocsForIdArray(idArray).then(function () {
                markBusy(false);
              });
            } else if (data.errors) {
              var errorText = "";
              for (var i = 0; i < data.errors.length; i++) {
                errorText += "<br><small><b>Code:</b> " + data.errors[i].code + '</small>';
                errorText += '<br><small><b>Message: </b>"' + data.errors[i].msg + '"</small>';
              }

              dec.options.current_result = errorText;
            }

            // shouldn't get here
            else {
              console.log("N1ql Query Fail/Success, data: " + JSON.stringify(data));
              markBusy(false);
            }

          },

          // ...or fail?
          function error(resp) {
            var data = resp.data, status = resp.status;
            //console.log("Editor Q Error Data: " + JSON.stringify(data));
            //console.log("Editor Q Error Status: " + JSON.stringify(status));

            if (data && data.errors) {
              var errorText = [];
              errorText.push("Query: " + query);
              for (var i = 0; i < data.errors.length; i++) {
                errorText.push("Code: " + data.errors[i].code);
                errorText.push('Message: "' + data.errors[i].msg + '"');
              }

              data.errors.unshift({"Query": query});
              var errorHTML = '';
              errorText.forEach(function (message) {
                errorHTML += message + '<br>'
              });
              dec.options.current_result = errorHTML;
            }
            else {
              var error = "Error: " + status + "<br>";
              if (resp.message)
                error += resp.message;
              dec.options.current_result = error;
            }
            markBusy(false);
          });

    }

    //
    // base URL for all REST calls given selected bucket, scope, collection
    //
    // for mixed clusters, we might not have a scope/collection
    //

    function get_base_url() {
      var url = "../pools/default/buckets/" + myEncodeURIComponent(dec.options.selected_bucket);
      if (dec.options.selected_scope)
        url += "/scopes/" + myEncodeURIComponent(dec.options.selected_scope) +
          "/collections/" + myEncodeURIComponent(dec.options.selected_collection);
      return url;
    }

    //
    // given an array of IDs, get the documents, metadata, and xattrs for each ID, and put
    // them into the current result
    //

    function getDocsForIdArray(idArray) {
      var promiseArray = [];
      var sizeWarning = {warnedYet: false};

      //console.log("Getting docs for: " + JSON.stringify(idArray));
      dec.options.current_result.length = idArray.length;

      for (var i = 0; i < idArray.length; i++) {
        var rest_url = get_base_url() +
          "/docs/" + myEncodeURIComponent(idArray[i]);
        //console.log("  url: " + rest_url);

        promiseArray.push($http.do({
          url: rest_url,
          method: "GET"
        }).then(getDocReturnHandler(i, sizeWarning, idArray),
          getDocReturnErrorHandler(i, idArray)));
      }

      var all_promise = Promise.all(promiseArray);
      //all_promise.then(function() {if (sizeWarning.warnedYet) closeErrorDialog();});
      return all_promise;
    }

    //
    // callback when we retrieve a document that belongs in a certain spot in the
    // results array
    //

    function getDocReturnHandler(position, sizeWarning, idArray) {
      return function success(resp) {
        if (resp && resp.status == 200 && resp.data) try {

          var docInfo = resp.data;
          var docId = docInfo.meta.id;

          if (!sizeWarning.warnedYet && docInfo.json && docInfo.json.length > largeDoc) {
            sizeWarning.warnedYet = true;
            showErrorDialog("Warning: large documents.", "Some of the documents in the result set are large, and processing them may take some time.", true);
          }

          var doc = qwFixLongNumberService.fixLongInts('{ "data": ' + docInfo.json + '}');
          //console.log("Got single doc results for " + position + ": " + JSON.stringify(doc));

          // did we get a json doc back?
          if (docInfo && docInfo.json && docInfo.meta) {
            docInfo.meta.type = "json";
            dec.options.current_result[position] =
              {
                id: docId, docSize: docInfo.json.length, data: doc.data, meta: docInfo.meta,
                xattrs: docInfo.xattrs, rawJSON: doc.rawJSON ? docInfo.json : null, rawJSONError: doc.rawJSONError
              };

            update_display_json(position, docInfo.json);
          }

          // maybe a single binary doc?
          else if (docInfo && docInfo.meta && (docInfo.base64 === "" || docInfo.base64)) {
            docInfo.meta.type = "base64";
            dec.options.current_result[position] =
              {id: docInfo.meta.id, base64: atob(docInfo.base64), meta: docInfo.meta, xattrs: docInfo.xattrs};
          } else
            console.log("Unknown document: " + JSON.stringify(docInfo));

          // viewable version of the document JSON

        } catch (e) {
          dec.options.current_result[position] = {
            id: idArray[position],
            data: "ERROR retrieving document.",
            meta: {type: "json"},
            xattrs: {},
            error: true
          };
        }
      }
    }

    // each document will have a "display_json" field that contains a version of the json that is truncated
    // if necessary

    var max_display_length = 200;

    function update_display_json(row,json) {
      var display_json = json;
      if (json && json.length > max_display_length)
        display_json = json.substring(0, max_display_length) + '...';
      dec.options.current_result[row].display_json = display_json;
    }

    //
    // when getting the documents by ID, handle any failures
    //

    function getDocReturnErrorHandler(position, idArray) {
      return function error(resp) {
        var data = resp.data, status = resp.status;
        //console.log("Got REST error status: " + status + ", data: " + JSON.stringify(resp));
        dec.options.current_result[position] = {
          id: idArray[position],
          data: {status: resp.status, error: resp.error},
          meta: {type: "json"},
          xattrs: {},
          error: true
        };

        if (status == 404) {
          var message = JSON.stringify(resp.status);
          if (resp.statusText)
            message += " - " + resp.statusText;
          dec.options.current_result[position].data = "ERROR: Document not found.";
          showErrorDialog("Error with document: " + idArray[position],  message, true);
        }

        else if (data && data.errors) {
          dec.options.current_result[position].data = "ERROR: " + JSON.stringify(data.errors);
        } else if (resp && resp.error) {
          dec.options.current_result[position].data = "ERROR: " + JSON.stringify(resp.error);
        } else if (resp.statusText && !resp.error) {
          dec.options.current_result[position].data = "ERROR: " + JSON.stringify(resp.statusText);
        }
       }
    }

    //
    // Show an error dialog
    //

    function showErrorDialog(title, detail, hide_cancel) {
      if (!Array.isArray(detail))
        return qwDialogService.showErrorDialog(title, detail, null, hide_cancel);

      else
        return qwDialogService.showErrorDialog(title, null, detail, hide_cancel);
    }

    function closeErrorDialog() {
//      $uibModalStack.dismissAll();
    }

    //
    // get the documents using the REST API
    //

    function retrieveDocs_rest() {

      if (dec.options.queryBusy) // don't have 2 retrieves going at once
        return;

      dec.options.current_query = dec.options.selected_bucket + "." + dec.options.selected_scope + "." +
        dec.options.selected_collection;

      if (dec.options.doc_id && dec.options.show_id)
        dec.options.current_query += ', document id: ' + dec.options.doc_id;

      else {
        dec.options.current_query += ", limit: " +
          dec.options.limit + ", offset: " + dec.options.offset;
      }

      if (!dec.options.show_id && dec.options.doc_id_start)
        dec.options.current_query += ", startKey: " + dec.options.doc_id_start;

      if (!dec.options.show_id && dec.options.doc_id_end)
        dec.options.current_query += ", endKey: " + dec.options.doc_id_end;

      // can only use REST API to retrieve single docs from emphemeral buckets
      if (!dec.options.doc_id && dec.buckets_ephemeral[dec.options.selected_bucket]) {
        dec.options.current_result =
          "Ephemeral buckets can only be queried by document ID, or via a primary or secondary GSI index.";
        refreshResults();
        return;
      }

      // get the stats from the Query service
      markBusy(true);
      dec.options.current_result = [];

      // we just get a single ID if they specified a doc_id
      if (dec.options.show_id && dec.options.doc_id && dec.options.doc_id.length) {
        getDocsForIdArray([dec.options.doc_id]).then(function () {
          //console.log("results: " + JSON.stringify(dec.options.current_result));
          markBusy(false);
        });
        return;
      }

      // otherwise use skip, offset, and optionally start & end keys
      var rest_url = get_base_url() +
        "/docs?skip=" + dec.options.offset + "&include_docs=false&limit=" + dec.options.limit;

      if (!dec.options.show_id && dec.options.doc_id_start)
        rest_url += "&startkey=%22" + myEncodeURIComponent(dec.options.doc_id_start) + '%22';

      if (!dec.options.show_id && dec.options.doc_id_end)
        rest_url += "&endkey=%22" + myEncodeURIComponent(dec.options.doc_id_end) + '%22';

      $http.do({
        url: rest_url,
        method: "GET"
      }).then(function success(resp) {
        if (resp && resp.status == 200 && resp.data) {
          dec.options.current_result.length = 0;

          var data = resp.data;

          //console.log("Got REST results: " + JSON.stringify(data));

          // we asked for a set up of document ids
          if (data && data.rows) {
            var idArray = [];
            for (var i = 0; i < data.rows.length; i++) {
              idArray.push(data.rows[i].id);
            }

            getDocsForIdArray(idArray).then(function () {
              //console.log("results: " + JSON.stringify(dec.options.current_result));
              markBusy(false);
            });
          }
          //console.log("Current Result: " + JSON.stringify(dec.options.current_result));
        }
      }, function error(resp) {
        var data = resp.data, status = resp.status;
        //console.log("Got REST error status: " + status + ", resp: " + JSON.stringify(resp,null,2));

        if (data) {
          if (data.errors)
            dec.options.current_result = JSON.stringify(data.errors);
          else
            dec.options.current_result = JSON.stringify(data, null, 2);
          showErrorDialog("Error getting documents.",
            "Couldn't retrieve: " + dec.options.selected_bucket + " offset: " + dec.options.offset +
            " limit " + dec.options.limit + ', Error:' + dec.options.current_result, true);
        }

        markBusy(false);
      });

    }

    //
    // does a collection have primary or secondary indexes?
    //

    function has_prim() {
      var scope = dec.options.selected_scope, collection = dec.options.selected_collection;
      // no collections on mixed clusters
      if (!dec.compat.atLeast70) {
        scope = "_default";
        collection = "_default";
      }

      if (dec.options.selected_bucket && scope && collection &&
        dec.indexes[dec.options.selected_bucket] &&
        dec.indexes[dec.options.selected_bucket][scope] &&
        dec.indexes[dec.options.selected_bucket][scope][collection])
        return dec.indexes[dec.options.selected_bucket][scope][collection].primary;
      else
        return false;
    }

    function has_sec() {
      var scope = dec.options.selected_scope, collection = dec.options.selected_collection;
      // no collections on mixed clusters
      if (!dec.compat.atLeast70) {
        scope = "_default";
        collection = "_default";
      }

      if (dec.options.selected_bucket && scope && collection &&
        dec.indexes[dec.options.selected_bucket] &&
        dec.indexes[dec.options.selected_bucket][scope] &&
        dec.indexes[dec.options.selected_bucket][scope][collection])
        return dec.indexes[dec.options.selected_bucket][scope][collection].secondary;
      else
        return false;
    }

    function has_indexes() {
      return (has_prim() || has_sec());
    }

    //
    // if the user updates something, we like to refresh the results, unless
    // there are unsaved changes
    //

    function refreshUnlessUnsaved(changedDocLength) {

      // if the document is large, don't auto-refresh because the results might not be ready
      if (changedDocLength > largeDoc)
        return;

      // if nothing else on screen is dirty, refresh
      else if (!document.getElementById('somethingChangedInTheEditor')) {
        retrieveDocs_inner();
      }
      // otherwise let the user know that updates are not yet visible
      else {
        showErrorDialog("Info",
          "Because you have unsaved document edits, some changes won't be shown until you retrieve docs.", true);
      }
    }

    //
    // the default encodeURIComponent doesn't encode "." or "..", even though can mess up an URL.
    //

    function myEncodeURIComponent(name) {
      if (name) switch (name) {
        case ".":
          return ("%2E");
        case "..":
          return ("%2E%2E");
        default:
          return (encodeURIComponent(name));
      }
    }

    //
    // when we first get the list of buckets, get the index status for each
    //

    function bucketsUpdate(metadata) {
      metadataUpdate(metadata);

      // create an index placeholder for each bucket
      dec.buckets.forEach(bucketName => dec.indexes[bucketName] = {});

      //
      // we have all the buckets, now get the indexes from the REST API, and
      // record whether each collection has a primary or secondary index
      //
      var promise = $http.do({
        url: "../indexStatus",
        method: "GET"
      }).then(function success(resp) {
        if (resp.status == 200 && resp.body && _.isArray(resp.body.indexes)) {
          resp.body.indexes.forEach(index => {
            var bucketName = index.bucket;
            var scopeName = index.scope;
            var collName = index.collection;
            var primary = index.definition.startsWith("CREATE PRIMARY");
            dec.indexes[bucketName] = dec.indexes[bucketName] || {};
            dec.indexes[bucketName][scopeName] = dec.indexes[bucketName][scopeName] || {};
            dec.indexes[bucketName][scopeName][collName] = dec.indexes[bucketName][scopeName][collName] || {};
            if (primary)
              dec.indexes[bucketName][scopeName][collName].primary = true;
            else
              dec.indexes[bucketName][scopeName][collName].secondary = true;
          });
        }

        // if we have selected becket/scope/collection, get the initial set of documents
        if (dec.options.selected_bucket && dec.options.selected_scope && dec.options.selected_collection &&
            dec.buckets.indexOf(dec.options.selected_bucket) != -1)
            retrieveDocs_inner();

      }, function error(resp) {
        console.log("Error getting indexes: " + JSON.stringify(resp.body));
      });
    }

    function metadataUpdate(metadata) {
      dec.buckets = metadata.buckets;
      dec.buckets_ephemeral = metadata.buckets_ephemeral;
    }

    //
    // when we activate, check with the query service to see if we have a query node. If
    // so, we can use n1ql, if not, use the regular mode.
    //

    function activate() {
      // the following checks whether the query service is active, and if so updates the list of buckets
      // and checks their index status
      qwQueryService.updateBuckets();

      //qwCollectionsService.bucket_bus('bucket_metadata').subscribe(bucketsUpdate);
      //qwCollectionsService.bucket_bus('scopes_coll_metadata').subscribe(scopeCollUpdate);

      // use the collections service to get the list of buckets from the REST API
      qwCollectionsService.getBuckets().then(meta => bucketsUpdate(meta));
    }
  }

}
