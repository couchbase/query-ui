import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
  ViewEncapsulation,
  ChangeDetectorRef}               from '@angular/core';

import { NgbModal, NgbModalConfig }from '@ng-bootstrap/ng-bootstrap';

import { QwDialogService }         from '../../angular-directives/qw.dialog.service.js';
import { QwQueryService }          from '../../angular-services/qw.query.service.js';

import { QwFunctionDialog }        from '../../angular-components/workbench/dialogs/qw.function.dialog.component.js';
import { QwFunctionLibraryDialog } from '../../angular-components/workbench/dialogs/qw.function.library.dialog.component.js';

export {QwUdfComponent};


class QwUdfComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        templateUrl:  "../_p/ui/query/angular-components/workbench/qw.udf.html",
        //styleUrls: ["../../angular-directives/qw.directives.css"],
        encapsulation: ViewEncapsulation.None,
      })
    ]
  }

  static get parameters() {
    return [
      NgbModal,
      QwDialogService,
      QwQueryService,
    ];
  }

  ngOnInit() {
    this.qqs.updateUDFs();
    this.qqs.updateUDFlibs();
  }

  constructor(
    modalService,
    qwDialogService,
    qwQueryService) {
    super();

    this.qqs = qwQueryService;
    this.qds = qwDialogService;
    this.modalService = modalService;

    this.function_sort = 'name';
    this.function_sort_direction = 1;
  }

  ngOnDestroy() {
  }

  //
  // functions for handling table sorting
  //

  get_sorted_udfs() {
    let This = this;
    switch(this.function_sort) {
      case 'name':
        return this.qqs.udfs.sort((a,b) => a.identity.name.localeCompare(b.identity.name)*This.function_sort_direction);
      case 'scope':
        return this.qqs.udfs.sort((a,b) => ((a.identity.bucket || '') + (b.identity.scope || ''))
          .localeCompare((b.identity.bucket || '')+(b.identity.scope || ''))*This.function_sort_direction);
      case 'language':
        return this.qqs.udfs.sort((a,b) => a.definition['#language'].localeCompare(b.definition['#language'])*This.function_sort_direction);
    }
    return this.qqs.udfs;
  }

  update_function_sort(field) {
    if (this.function_sort == field)
      this.function_sort_direction *= -1;
    else {
      this.function_sort = field;
      this.function_sort_direction = 1;
    }
  }

  show_up_caret_function(field) {
    return(this.function_sort == field && this.function_sort_direction == -1);
  }

  show_down_caret_function(field) {
    return(this.function_sort == field && this.function_sort_direction == 1);
  }

  // get params for display in list

  getFunctionParams(fn) {
    if (!fn.definition.parameters || fn.definition.parameters.length == 0)
      return('...')
    else
      return(JSON.stringify(fn.definition.parameters));
  }

  // inline functions are just 'inline', but javascript are: javascript (lib name)
  getFunctionLanguage(fn) {
    let result = fn.definition['#language'];
    if (fn.definition.library)
      result += ' (' + fn.definition.library + ')';
    return(result);
  }

  // function edit/drop/create

  createFunction() {
    let This = this;
    this.dialogRef = this.modalService.open(QwFunctionDialog);
    this.dialogRef.componentInstance.header = "Add Function";
    this.dialogRef.componentInstance.name = "";
    this.dialogRef.componentInstance.bucket = null;
    this.dialogRef.componentInstance.function_type = 'inline';
    this.dialogRef.componentInstance.expression = "";
    this.dialogRef.componentInstance.parameters = ['...'];
    this.dialogRef.componentInstance.is_new = true;
    if (this.qqs.udfLibs.length > 0)
      this.dialogRef.componentInstance.library_name = this.qqs.udfLibs[0].name;

    this.dialogRef.result
      .then(function ok(new_value) {
        This.qqs.updateUDFs();
      }, function cancel() {});
  }

  editFunction(fn) {
    let This = this;
    this.dialogRef = this.modalService.open(QwFunctionDialog);
    this.dialogRef.componentInstance.header = "Edit Function";
    this.dialogRef.componentInstance.is_new = false;
    this.dialogRef.componentInstance.name = fn.identity.name;
    if (fn.identity.type == "scope") {
      this.dialogRef.componentInstance.bucket = fn.identity.bucket;
      this.dialogRef.componentInstance.scope = fn.identity.scope;
    }
    this.dialogRef.componentInstance.type = fn.definition['#language'];
    switch (fn.definition['#language']) {
      case 'javascript':
        this.dialogRef.componentInstance.library_name = fn.definition.library;
        this.dialogRef.componentInstance.library_function = fn.definition.object;
        this.dialogRef.componentInstance.function_type = 'javascript';
        break;
      case 'inline':
        this.dialogRef.componentInstance.expression = fn.definition.expression;
        this.dialogRef.componentInstance.function_type = 'inline';
        break;
    }
    this.dialogRef.componentInstance.parameters = fn.definition.parameters || ['...'];

    this.dialogRef.result
      .then(function ok(new_value) {
        This.qqs.updateUDFs();
      }, function cancel() {});
  }

  dropFunction(fn) {
    let This = this;
    let fnName = (fn.identity.bucket ? '`' + fn.identity.namespace + '`:`' + fn.identity.bucket + '`.`' +
        fn.identity.scope + '`.`' : '`') + fn.identity.name + '`';
    this.qds.showNoticeDialog("Confirm Drop Function", "Warning, this function will be permanently removed: ",
      ["Drop: " + fnName], "false")
      .then(function ok() {
        let query = 'DROP FUNCTION ' + fnName;
        This.qqs.executeQueryUtil(query, false)
          .then(function ok() {
              This.qqs.updateUDFs();
              This.qqs.updateUDFlibs();
            },
            function err(resp) {
              console.log("delete query: " + query);
              console.log("Got error deleting function: " + JSON.stringify(resp));
            });
      }, function cancel() {
      });
  }

  // library editor/drop/create

  createLibrary() {
    let This = this;
    this.dialogRef = this.modalService.open(QwFunctionLibraryDialog);
    this.dialogRef.componentInstance.header = "Add Library";
    this.dialogRef.componentInstance.new_lib = true;
    this.dialogRef.componentInstance.lib_name = '';
    this.dialogRef.componentInstance.lib_contents =
      '/* a UDF library contains one or more javascript functions */\n' +
      'function add(a,b) {\n' +
      '  return(a+b);\n' +
      '}\n';
    this.dialogRef.result
      .then(function ok() {}, function cancel(resp) {});
  }

  editLibrary(lib) {
    let This = this;
    this.dialogRef = this.modalService.open(QwFunctionLibraryDialog);
    this.dialogRef.componentInstance.header = "Edit Library";
    this.dialogRef.componentInstance.new_lib = false;
    this.dialogRef.componentInstance.lib_name = lib.name;
    this.dialogRef.componentInstance.lib_contents = lib.content;
    this.dialogRef.result
      .then(function ok() {}, function cancel(resp) {});
  }

  dropLibrary(lib) {
    let This = this;
    this.qds.showNoticeDialog("Confirm Drop Function Library", "Warning, this javascript function library will be permanently removed:",
        [lib.name], "false")
      .then(function ok() {
        This.qqs.dropUDFlib(lib.name)
          .then(function success() {This.qqs.updateUDFlibs();},
            function err(resp) {This.qqs.updateUDFlibs();console.log("Error deleting library: " + JSON.stringify(resp))})
      }, function cancel() {
        console.log("cancel");
      });
  }

}
