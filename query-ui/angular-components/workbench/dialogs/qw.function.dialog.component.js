/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {MnLifeCycleHooksToStream}     from 'mn.core';
import {NgbActiveModal}               from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }               from '@angular/common';
import {FormControl, FormGroup, Validators} from '@angular/forms';

import {QwCollectionsService}         from "../../../angular-services/qw.collections.service.js";
import {QwQueryWorkbenchService}               from "../../../angular-services/qw.query.workbench.service.js";

import template                       from "./qw.function.dialog.html";

export { QwFunctionDialog };

class QwFunctionDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      template,
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css",
                  "../_p/ui/query/ui-current/query.css"],
      imports: [ CommonModule ],
      inputs: [
        "header",
        "name",
        "bucket",
        "scope",
        "parameters",
        "function_type",
        "library_name",
        "library_function",
        "expression_sql",
        "expression_javascript",
        "is_new",
        "global_functions_permitted",
        "scoped_functions_permitted",
        "external_permitted",
        "inline_permitted",
      ],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwCollectionsService,
      QwQueryWorkbenchService,
      ];
  }

  ngOnInit() {
    this.expression_sql = this.function_type == 'inline_sql' ? this.expression: '';
    this.expression_javascript = this.function_type == 'inline_javascript' ? this.expression: '';
    this.initialNamespace = {selected_bucket: this.bucket, selected_scope: this.scope};
    // make sure we have a valid function_type
    if (!this.function_type)
      this.function_type = this.inline_permitted ? 'inline_sql' : 'external_javascript';
    // and a valid library name (if javascript function)
    if (this.function_type == 'javascript' && !this.library_name)
      this.library_name = this.libraries()[0] ? this.libraries()[0].name : null;
    // make sure empty parameters shown correctly
    if (!this.parameters)
      this.parameters = [];
    if (this.scope)
      this.scope_list.push(this.scope);

    // we make a form group for only those options that need validation
    this.formGroup = new FormGroup({
      name: new FormControl(this.name,[Validators.pattern("^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,99}$")]),
      expression_sql: new FormControl(this.expression_sql,[Validators.required]),
      expression_javascript: new FormControl(this.expression_javascript,[Validators.required]),
    });

    this.formGroup.get('name').valueChanges.subscribe(data => this.name = data);
    this.formGroup.get('expression_sql').valueChanges.subscribe(data => this.expression_sql = data);
    this.formGroup.get('expression_javascript').valueChanges.subscribe(data => this.expression_javascript = data);
  }

  ngAfterViewInit() {
  }

  constructor(activeModal,
              qwCollectionsService,
              qwQueryService,
  ) {
    super();

    this.activeModal = activeModal;
    this.qqs = qwQueryService;
    this.qcs = qwCollectionsService;

    this.bucket_list = [];
    this.scope_list = [];

    this.qcs.getBuckets().then(meta => {
      this.bucket_list.length = 0;
      meta.buckets.forEach(bucket => this.bucket_list.push(bucket));
    });
  }

  // when the namespace is selected, update our results
  namespace_changed(namespace) {
    this.bucket = namespace.bucket;
    this.scope = namespace.scope;
    // make sure we have a valid library name when the namespace changes
    let libs = this.libraries();
    if (!this.library_name || libs.indexOf(this.library_name) == -1)
      this.library_name = (libs.length > 0) ? libs[0].name : null;
  }

   // when function type changes or new namespace selected, make sure selected library valid for namespace
  check_lib() {
    let libs = this.libraries();
    if (libs.length == 0)
      this.library_name = null;
    else if (this.library_name == null)
      this.library_name = libs[0].name;
  }

  libraries() { // only show libraries from the currently selected namespace
    return this.qqs.udfLibs.filter(lib =>
        (this.bucket == null && lib.bucket == "") ||
        (this.bucket == lib.bucket && this.scope == lib.scope));
  }

  getLibContent() {
    let lib = this.qqs.udfLibs.find(lib => lib.name == this.library_name);
    if (lib)
      return(lib.content)
  }

  ok_to_save() {
    return(
        (this.name != null && this.name.trim().length > 0) &&    // need function name...
        (!this.is_new || !this.functionNameUsed(this.name)) &&   // ...that is not already used
        ((this.function_type == 'inline_sql' && this.expression_sql) ||  // ...and is appropriately defined
         ((this.function_type == 'inline_javascript')  && this.expression_javascript) ||  // ...and is appropriately defined
         (this.function_type == 'external_javascript' && this.library_name && this.library_function)));
  }

  // uses qw.query.service to create/update the function
  createOrReplaceFunction() {
    this.error = null;
    let This = this;
    let scope = (this.bucket && this.scope) ?
      'default:`' + this.bucket + '`.`' + this.scope + '`.' : '';
    var as_expr;

    let language = '';
    let expr = '';

    switch (this.function_type) {
      case 'inline_sql':
        language = 'INLINE';
        expr = this.expression_sql.trim();
        // inline functions need parens around them if not already there
        if (!expr.match(/^\([\s\S]+\)$/))
          expr = '(' + expr + ')';
        as_expr = expr;
        break;

      case 'inline_javascript':
        expr = this.expression_javascript.trim();
        language = 'JAVASCRIPT';
        // inline javascript functions must begin and end with single quotes
        if (!expr.match(/^'[\s\S]+'$/))
          expr = "'" + expr + "'";
        as_expr = expr;
        break;

      case 'external_javascript':
        language = 'JAVASCRIPT';
        break;
    }
    if (this.function_type.startsWith('inline')) {
    }
    else {
      as_expr = '"' + this.library_function + '" AT "';
      if (this.bucket && this.scope)
        as_expr += this.bucket + '/' + this.scope + '/';
      as_expr += this.library_name + '"';
    }

    let query = "CREATE OR REPLACE FUNCTION " +
      scope + '`' + this.name + '` (' + this.parameters.join(',') + ') LANGUAGE ' +
      language + ' AS ' + as_expr;

    this.qqs.executeQueryUtil(query, false)
      .then(function success(resp) {
        if (resp.data && resp.data.errors && resp.data.errors[0])
          This.error = JSON.stringify(resp.data.errors[0]);
        else
          This.activeModal.close('ok');
        },
      function fail(resp) {
        This.error = 'Creation query: ' + query + '\n';
        if (resp.data && resp.data.errors)
          This.error += JSON.stringify(resp.data.errors);
        else if (resp.error && resp.error.errors)
          This.error += JSON.stringify(resp.error.errors);
        else
          This.error += "Error updating function, status: " + resp.status +
            " - " + resp.statusText;
      });
  }

  // options for editor showing error status
  setErrorOptions(_editor) {
    _editor.setOptions({
      mode: 'ace/mode/json',
      showGutter: false,
      maxLines: 10
    });
    _editor.$blockScrolling = Infinity;
    _editor.setReadOnly(true);
    _editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
  }

  // check if function name already in use
  functionNameUsed() {
    return this.qqs.udfs.some(udf => udf.identity.name == this.name &&
      ((this.bucket == null && udf.identity.type == "global") ||
        (udf.identity.type == "scope" && this.bucket == udf.identity.bucket && this.scope == udf.identity.scope)));
  }

  // for iterating over the array of strings used for parameters, we need a track-by function
  trackByFn(index, item) {
    return(index);
  }

  getInlinePlaceholder() {
    let name = this.name || 'function_name';
    let params = this.parameters.length == 1 && this.parameters[0] == '...' ? 'args' : this.parameters.join(',');
    return`JavaScript function, e.g.,\n\nfunction ${name}(${params}) { return 'result'; }`
  }
}
