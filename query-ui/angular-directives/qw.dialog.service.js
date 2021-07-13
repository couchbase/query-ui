import { NgbModal,
  NgbModalConfig }           from '@ng-bootstrap/ng-bootstrap';
import { QwDocEditorDialog } from './dialogs/qw.doc.editor.dialog.component.js';
import { QwErrorDialog }     from './dialogs/qw.error.dialog.component.js';
import { QwInputDialog }     from './dialogs/qw.input.dialog.component.js';
import { QwNoticeDialog }    from './dialogs/qw.notice.dialog.component.js';
import { MnPoolDefault }     from 'ajs.upgraded.providers';
import { QwHttp }            from '../angular-services/qw.http.js';
import js_beautify           from "js-beautify";

export { QwDialogService };


class QwDialogService {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    MnPoolDefault,
    NgbModal,
    NgbModalConfig,
    QwHttp,
  ]}

  constructor(mnPoolDefault, modalService, ngbModalConfig, qwHttp) {
    this.modalService = modalService;
    this.compat = mnPoolDefault.export.compat;
    this.qwHttp = qwHttp;
    ngbModalConfig.backdrop = "static";
  }

  //
  // this dialog returns a promise where the first argument is called
  // if the dialog is 'closed', the second if the dialog is 'dismissed'.
  // In the case of the error dialog, 'close' happens if the user clicks OK,
  // while 'dismiss' happens if they click CANCEL
  //
  // e.g.
  //
  // qwDialogService.showErrorDialog("Serious Error","We are out of chocolate!",null,false)
  //   .then(function close(result)   {console.log("User hit OK");},
  //         function dismiss(result) {console.log("User hit cancel");});
  //
  showErrorDialog(error_title,error_detail,error_detail_array,hide_cancel) {
    this.dialogRef = this.modalService.open(QwErrorDialog);
    this.dialogRef.componentInstance.error_title = error_title;
    this.dialogRef.componentInstance.error_detail = error_detail;
    this.dialogRef.componentInstance.error_detail_array = error_detail_array;
    this.dialogRef.componentInstance.hide_cancel = hide_cancel;
    return(this.dialogRef.result);
  }

  //
  // this info dialog returns a promise when the user clicks "OK", the only option
  //
  showInfoDialog(title,detail) {
    this.dialogRef = this.modalService.open(QwErrorDialog);
    this.dialogRef.componentInstance.error_title = title;
    this.dialogRef.componentInstance.error_detail = detail;
    this.dialogRef.componentInstance.error_detail_array = null;
    this.dialogRef.componentInstance.info = true;
    this.dialogRef.componentInstance.hide_cancel = true;
    return(this.dialogRef.result);
  }

  //
  // this shows the document editor dialog, assuming that you already have the contents of document.
  // if you need to retrieve the document, see the next function.
  //   readonly - can the user edit the document?
  //   header - the message at the top of the dialog
  //   doc_id - the document id
  //   doc_json - json for the document
  //   doc_meta - metadata and xattrs
  //   new_doc - whether to show an editable document ID field
  //
  // if user clicks 'ok' to save the document, the first function from the promise
  // is called with the new document text as the argument.
  //
  // e.g.
  //
  // qwDialogService.showDocEditorDialog(false,"Edit Doc","12345",'{"hello":"world"}','')
  //   .then(function close(result)   {console.log("User hit OK, 'result' is new document");},
  //         function dismiss(result) {console.log("User hit cancel");});
  //
  showDocEditorDialog(readonly,header,doc_id,doc_json,doc_meta,new_doc) {
    this.dialogRef = this.modalService.open(QwDocEditorDialog);
    this.dialogRef.componentInstance.readonly = readonly;
    this.dialogRef.componentInstance.header = header;
    this.dialogRef.componentInstance.doc_id = doc_id;
    this.dialogRef.componentInstance.doc_json = doc_json;
    this.dialogRef.componentInstance.doc_meta = doc_meta;
    this.dialogRef.componentInstance.new_doc = new_doc;
    return(this.dialogRef.result);
  }


  //
  // Retrieve a document by id for viewing and possibly editing in the editor dialog. This is
  // for showing documents from the free-text search results list, and also for editing the sample
  // document in the Views UI.
  //  readonly - can the user edit or not?
  //  header - message for the top of the dialog
  //  bucket - name of bucket
  //  scope - name of scope, ignored if we are pre-7.0 mixed cluster
  //  collection - name of collection, ignored if we are pre-7.0 mixed cluster
  //  docId - id to retrieve the document
  //
  getAndShowDocument(readonly,header,bucket,scope,collection,docId) {
    var rest_url = "../pools/default/buckets/" + myEncodeURIComponent(bucket);

    if (this.compat.atLeast70)
      rest_url += "/scopes/" + myEncodeURIComponent(scope) +
          "/collections/" + myEncodeURIComponent(collection);

    rest_url += "/docs/" + myEncodeURIComponent(docId);
    var This = this;

    return this.qwHttp.get(rest_url)
    .then(
        function success(resp) {
          if (resp && resp.status == 200 && resp.data) {

            var docInfo = resp.data;
            var docId = docInfo.meta.id;

            // did we get a json doc back? if so, and if the doc is editable, handle any changes
            if (docInfo && docInfo.json && docInfo.meta) {
              var promise = This.showDocEditorDialog(readonly,header,docId,js_beautify(docInfo.json,{"indent_size": 2}),
                                                     JSON.stringify(docInfo.meta,null,2),false);
              if (readonly)    // no editing
                return(promise);

              return promise.then(
                function close(result) { // used clicked o.k, save document
                  return(This.qwHttp.post(rest_url,{flags: 0x02000006, value: result.json}));
                },
                function dismiss(result) {
                  return Promise.resolve("dialog closed, no changes");
                }
              );
            }

            // maybe a single binary doc? can't edit it then
            else if (docInfo && docInfo.meta && (docInfo.base64 === "" || docInfo.base64)) {
              // make sure always returns a resolved promise, since they can't make changes
              var promise = This.showDocEditorDialog(true,"read-only binary doc",docId,JSON.stringify(atob(docInfo.base64)),
                                                     docInfo.meta,false);
              return promise.then(() => Promise.resolve("done"),() => Promise.resolve("dialog closed, no changes"));
            }
          }

          // shouldn't get here
          return(Promise.reject("Can't show doc editor."));
        },
      function error(resp) {
        var error_message = "Error " + resp.status + " retrieving document: " + docId;
        if (resp.statusText)
          error_message += " - " + resp.statusText;
        return(Promise.reject(error_message));
      });
  }


  //
  // show a dialog to get a text value from the user
  //
  // e.g.
  //
  // qwDialogService.showInputDialog("DocID","Enter DocID for new document",'')
  //   .then(function close(result)   {console.log("User hit OK, 'result' is value entered by the user");},
  //         function dismiss(result) {console.log("User hit cancel");});
  //
  showInputDialog(header_message, body_message, input_value) {
    this.dialogRef = this.modalService.open(QwInputDialog);
    this.dialogRef.componentInstance.header_message = header_message;
    this.dialogRef.componentInstance.body_message = body_message;
    this.dialogRef.componentInstance.input_value = input_value;
    return(this.dialogRef.result);
  }

  //
  // show a dialog with a message for the user
  //
  // e.g.
  //
  // qwDialogService.showNoticeDialog("Warning","You selected a large file, it may take some time to load")
  //   .then(function close(result)   {console.log("User hit OK, 'result' is value entered by the user");})
  //
  showNoticeDialog(header_message, body_message) {
    this.dialogRef = this.modalService.open(QwNoticeDialog);
    this.dialogRef.componentInstance.header_message = header_message;
    this.dialogRef.componentInstance.body_message = body_message;
    return(this.dialogRef.result);
  }

  //
  // close all dialogs
  //

  closeAllDialogs() {
    this.modalService.dismissAll();
  }

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
