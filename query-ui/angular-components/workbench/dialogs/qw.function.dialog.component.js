import {MnLifeCycleHooksToStream}     from 'mn.core';
import {NgbActiveModal}               from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }               from '@angular/common';
import {FormControl, FormGroup, Validators} from '@angular/forms';

import {QwCollectionsService}         from "../../../angular-services/qw.collections.service.js";
import {QwQueryService}               from "../../../angular-services/qw.query.service.js";

export { QwFunctionDialog };

class QwFunctionDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-components/workbench/dialogs/qw.function.dialog.html",
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
        "expression",
        "is_new",
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
    this.initialNamespace = {selected_bucket: this.bucket, selected_scope: this.scope};
    if (!this.function_type)
      this.function_type = "inline";
    if (!this.parameters)
      this.parameters = [];
    if (this.scope)
      this.scope_list.push(this.scope);

    // we make a form group for only those options that need validation
    this.formGroup = new FormGroup({
      name: new FormControl(this.name,[Validators.pattern("^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,99}$")]),
      expression: new FormControl(this.expression,[Validators.required]),
    });

    this.formGroup.get('name').valueChanges.subscribe(data => this.name = data);
    this.formGroup.get('expression').valueChanges.subscribe(data => this.expression = data);
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
      if (!expr.match(/^\([\s\S]+\)$/))
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
