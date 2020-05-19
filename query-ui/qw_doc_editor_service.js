import _ from "/ui/web_modules/lodash.js";
import js_beautify from "/ui/web_modules/js-beautify.js";
import angular from "/ui/web_modules/angular.js";
import qwFixLongNumberService from "./qw_fix_long_number_service.js";
import uiAce from "/ui/libs/ui-ace.js";
import ace from '/ui/libs/ace/ace-wrapper.js';

export default 'qwDocEditorService';

angular
  .module('qwDocEditorService', [qwFixLongNumberService,uiAce])
  .factory('qwDocEditorService', getQwDocEditorService);

function getQwDocEditorService(
    $rootScope, $http, $uibModal, $uibModalStack, $timeout, $q, $stateParams, qwFixLongNumberService
    ) {

  var des = {};
  des.getAndShowDocument = getAndShowDocument;
  des.showDocEditor = showDocEditor;

  //
  // retrieve a document by ID and show it in a dialog
  //
  function getAndShowDocument(bucket,docId) {
    var rest_url = "../pools/default/buckets/" + myEncodeURIComponent(bucket) + "/docs/" + myEncodeURIComponent(docId);

    $http({
      url: rest_url,
      method: "GET"
    }).then(
        function success(resp) {
          if (resp && resp.status == 200 && resp.data) {

            var docInfo = resp.data;
            var docId = docInfo.meta.id;

            // did we get a json doc back?
            if (docInfo && docInfo.json && docInfo.meta)
              showDocEditor(docId,js_beautify(docInfo.json,{"indent_size": 2}),
                  JSON.stringify(docInfo.meta,null,2),true);

            // maybe a single binary doc?
            else if (docInfo && docInfo.meta && (docInfo.base64 === "" || docInfo.base64))
              showDocEditor(docId,atob(docInfo.base64),docInfo.meta,true);
          }

        },
        function error(resp) {

        }
      );
  }

  //
  // bring up the JSON editing dialog for edit or create new documents
  //
  var config = ace.require("ace/config" );

  function showDocEditor(id,json,meta,readonly) {
    var dialogScope = $rootScope.$new(true);

    dialogScope.searchDoc = function() {
      config.loadModule("ace/ext/cb-searchbox",
                        function(e) {
                          if (dialogScope.showData && dialogScope.editor) e.Search(dialogScope.editor);
                          else if (!dialogScope.showData && dialogScope.meta_editor) e.Search(dialogScope.meta_editor);
                        });
    }

    dialogScope.setShowData = function(show) {dialogScope.showData = show;};
    dialogScope.getShowData = function() {return(dialogScope.showData);};

    // use an ACE editor for editing the JSON document
    dialogScope.ace_options = {
      mode: 'json',
      showGutter: true,
      useWrapMode: true,
      onChange: function(e) {
        if (dialogScope.editor && dialogScope.editor.getSession().getValue().length > 20*1024*1024) {
          dialogScope.error_message = "Documents larger than 20MB may not be edited.";
          dialogScope.$applyAsync(function() {});
        }
      },
      onLoad: function(_editor) {
        dialogScope.editor = _editor;
        _editor.$blockScrolling = Infinity;
        _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
        dialogScope.editor = _editor;
        _editor.setReadOnly(readonly);
        _editor.getSession().on("changeAnnotation", function() {
          var annot_list = _editor.getSession().getAnnotations();
          if (annot_list && annot_list.length) for (var i=0; i < annot_list.length; i++)
            if (annot_list[i].type == "error") {
              dialogScope.error_message = "Error on row: " + annot_list[i].row + ": " + annot_list[i].text;
              dialogScope.$applyAsync(function() {});
              return;
            }
          if (dialogScope.editor) {
            dialogScope.error_message = null; // no errors found
            dialogScope.$applyAsync(function() {});
          }
        });
        if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
          _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari
      },
      $blockScrolling: Infinity
    };
    // the document's metadata and xattrs will be shown in a separate ACE editor,
    // which needs slightly different options
    dialogScope.meta_ace_options = {
      mode: 'json',
      showGutter: true,
      useWrapMode: true,
      onLoad: function(_editor) {
        dialogScope.meta_editor = _editor;
        _editor.$blockScrolling = Infinity;
        _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
        _editor.setReadOnly(true);
        if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
          _editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari
      }
    };

    dialogScope.doc_id = id;
    dialogScope.doc_json = json;
    dialogScope.doc_meta = meta;
    dialogScope.header = readonly ? "View Document" : "Edit Document";
    dialogScope.readonly = readonly;
    dialogScope.showData = true;

    // are there any syntax errors in the editor?
    dialogScope.errors = function() {
      if (dialogScope.editor) {
        var annot_list = dialogScope.editor.getSession().getAnnotations();
        if (annot_list && annot_list.length)
          for (var i=0; i < annot_list.length; i++)
            if (annot_list[i].type == "error") {
              return true;
            }

        // don't allow empty documents or documents > 1MB
        if ((dialogScope.editor.getSession().getValue().trim().length == 0)/* ||
                                                                              (dialogScope.editor.getSession().getValue().trim().length > 1024*1024)*/)
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

    return({scope:dialogScope, promise:promise});
  }

  //
  // the default encodeURIComponent doesn't encode "." or "..", even though can mess up an URL.
  //

  function myEncodeURIComponent(name) {
    if (name) switch (name) {
      case ".": return("%2E");
      case "..": return("%2E%2E");
      default: return(encodeURIComponent(name));
    }
  }


  return des;
}
