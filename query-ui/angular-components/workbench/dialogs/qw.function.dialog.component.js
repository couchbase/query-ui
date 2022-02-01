import {MnLifeCycleHooksToStream}     from 'mn.core';
import {NgbActiveModal}               from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }               from '@angular/common';

import {QwCollectionsService}         from "../../../angular-services/qw.collections.service.js";
import {QwQueryService}               from "../../../angular-services/qw.query.service.js";

export { QwFunctionDialog };

class QwFunctionDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-components/workbench/dialogs/qw.function.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
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
        "expression",
      ],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwCollectionsService,
      QwQueryService,
      ];
  }

  ngOnInit() {
    if (!this.function_type)
      this.function_type = "inline";
    if (!this.parameters)
      this.parameters = [];
    if (this.scope)
      this.scope_list.push(this.scope);
    if (this.bucket)
      this.bucket_changed();
    else
      this.bucket = null;
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

    this.update_buckets();
  }

  update_buckets() {
    this.qcs.getBuckets().then(meta => {
      this.bucket_list.length = 0;
      meta.buckets.forEach(bucket => this.bucket_list.push(bucket));
    });
  }

  // when the bucket changes, make sure to update the scopes
  bucket_changed() {
    if (this.bucket)
      this.qcs.getScopesForBucket(this.bucket).then(meta => {
        this.scope_list.length = 0;
        meta.scopes[this.bucket].forEach(scope => this.scope_list.push(scope));
        // is our current scope valid?
        var i = this.scope_list.indexOf(this.scope);
        if (this.scope_list.length && i < 0)
          this.scope = this.scope_list[0];
      });
    else
      this.scope_list.length = 0;
  }

  libraries() {
    return this.qqs.udfLibs;
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
      ((this.function_type == 'inline' && this.expression) ||  // ...and is appropriately defined
      (this.function_type == 'javascript' && this.library_name && this.library_function)));
  }

  // uses qw.query.service to create/update the function
  createOrReplaceFunction() {
    this.error = null;
    let This = this;
    let scope = (this.bucket && this.scope) ?
      'default:`' + this.bucket + '`.`' + this.scope + '`.' : '';
    var as_expr;

    // inline functions need parens around them if not already there
    if (this.function_type == 'inline') {
      let expr = this.expression.trim();
      if (!expr.match(/^\(.+\)$/))
        expr = '(' + expr + ')';
      as_expr = expr;
    }
    else
      as_expr = '"' + this.library_function + '" AT "' + this.library_name + '"';

    let query = "CREATE OR REPLACE FUNCTION " +
      scope + '`' + this.name + '` (' + this.parameters.join(',') + ') LANGUAGE ' +
      this.function_type + ' AS ' + as_expr;

    this.qqs.executeQueryUtil(query, false)
      .then(function success() {
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


}
