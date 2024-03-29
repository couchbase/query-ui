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
import { QwCollectionsService }       from '../../../angular-services/qw.collections.service.js';
import { QwQueryWorkbenchService }             from '../../../angular-services/qw.query.workbench.service.js';
import { QwDialogService }            from '../../../angular-directives/qw.dialog.service.js';
import _                              from 'lodash';
import template                       from "./qw.function.library.dialog.html";

export { QwFunctionLibraryDialog };

class QwFunctionLibraryDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      template,
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: [
        "header",
        "lib_name",
        "lib_contents",
        "new_lib",
        "bucket",
        "scope",
        "is_new",
        "global_permitted",
        "scoped_permitted",
      ],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwCollectionsService,
      QwDialogService,
      QwQueryWorkbenchService,
      ];
  }

  ngOnInit() {
    this.initialNamespace = {selected_bucket: this.bucket, selected_scope: this.scope};
  }

  constructor(activeModal,
              qwCollectionsService,
              qwDialogService,
              qwQueryService) {
    super();

    this.activeModal = activeModal;
    this.qcs = qwCollectionsService;
    this.qqs = qwQueryService;
    this.qds = qwDialogService;
    this.config = ace.require("ace/config" );

    this.bucket_list = [];
    this.scope_list = [];

    qwCollectionsService.getBuckets().then(meta => {
      this.bucket_list.length = 0;
      meta.buckets.forEach(bucket => this.bucket_list.push(bucket));
    });

    // unbind ^F for all ACE editors
    var default_commands = ace.require("ace/commands/default_commands");
    for (var i=0; i< default_commands.commands.length; i++)
      if (default_commands.commands[i].name.startsWith("find")) {
        default_commands.commands.splice(i,1);
        i--;
      }
  }

  // when the namespace is selected, update our results
  namespace_changed(namespace) {
    this.bucket = namespace.bucket;
    this.scope = namespace.scope;
  }

  searchDoc() {
    var This = this;
    this.config.loadModule("ace/ext/cb-searchbox",
        function(e) {
          if (This.mainEditor) e.Search(This.mainEditor,true,true);
        });

  }

  errors() {
    // don't allow empty doc id
    if (!this.lib_name)
      return true;

    if (this.new_lib && this.libraryNameUsed())
      return true;

    if (this.bucket && !this.scope)
      return true;

    return false;
  }

  // global libraries have "" as their bucket and scope, but the menu returns null for bucket/scope
  libraryNameUsed() {
    return this.qqs.udfLibs.some(udfLib => (udfLib.name == this.lib_name &&
        ((udfLib.bucket == "" && this.bucket == null) || udfLib.bucket == this.bucket) &&
        ((udfLib.scope == "" && this.scope == null) || udfLib.scope == this.scope)));
  }

  onMainEditorReady(editor) {
    var This = this;
    this.mainEditor = editor;
    editor.$blockScrolling = Infinity;
    editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
    editor.setReadOnly(this.readonly);

    // disable syntax checking, since non-standard javascript in use
    editor.getSession().setUseWorker(false);
    if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
      editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

    editor.setOptions({
      mode: 'ace/mode/javascript',
      showGutter: true,
      wrap: true,
    });
  }

  // when they click o.k., update the new library
  createOrReplaceLibrary() {
    this.error = '';
    var This = this;
    this.qqs.newUDFlib(this.lib_name, this.lib_contents, this.bucket, this.scope)
      .then(function success() {
          setTimeout(This.qqs.updateUDFlibs,1000);
          This.activeModal.close('ok');
        },
        function error(resp) {
          if (resp.data && resp.data.errors)
            This.error += JSON.stringify(resp.data.errors);
          else if (_.isString(resp.error))
            This.error += resp.error;
          else if (resp.error && resp.error.errors)
            This.error += JSON.stringify(resp.error.errors);
          else
            This.error += "Error updating function, status: " + resp.status +
              " - " + resp.statusText;
          This.qds.showErrorDialog("Error Creating Library",This.error,null,true).then(()=>{},()=>{});
         }
      );
  }

}
