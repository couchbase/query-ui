import angular from "/ui/web_modules/angular.js";
import _ from "/ui/web_modules/lodash.js";

import { Injectable } from "/ui/web_modules/@angular/core.js";
import { downgradeInjectable } from '/ui/web_modules/@angular/upgrade/static.js';

import { NgbModal, NgbModalConfig }          from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';
import { QwDocEditorDialog } from './dialogs/qw.doc.editor.dialog.component.js';
import { QwErrorDialog }     from './dialogs/qw.error.dialog.component.js';
import { QwInputDialog }     from './dialogs/qw.input.dialog.component.js';

export { QwDialogService };


class QwDialogService {
  static get annotations() { return [
    new Injectable()
  ]}

  static get parameters() { return [
    NgbModal,
    NgbModalConfig,
  ]}

  constructor(modalService, ngbModalConfig) {
    this.modalService = modalService;
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
  // this shows the document editor dialog, with parameters for:
  //   readonly - can the user edit the document?
  //   header - the message at the top of the dialog
  //   doc_id - the document id
  //   doc_json - json for the document
  //   doc_meta - metadata and xattrs
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

}

angular
  .module('app', [])
  .factory('qwDialogService', downgradeInjectable(QwDialogService));
