/*
Copyright 2020-Present Couchbase, Inc.

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

export { QwDocEditorDialog };

class QwDocEditorDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-directives/dialogs/qw.doc.editor.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: ["readonly", "header", "doc_id","doc_json", "doc_meta", "new_doc"],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      ];
  }

  ngOnInit() {
  }

  constructor(activeModal) {
    super();

    this.activeModal = activeModal;
    this.showData = true;
    this.config = ace.require("ace/config" );

    // unbind ^F for all ACE editors
    var default_commands = ace.require("ace/commands/default_commands");
    for (var i=0; i< default_commands.commands.length; i++)
      if (default_commands.commands[i].name.startsWith("find")) {
        default_commands.commands.splice(i,1);
        i--;
      }
  }

  searchDoc() {
    var This = this;
    this.config.loadModule("ace/ext/cb-searchbox",
        function(e) {
          if (This.showData && This.mainEditor) e.Search(This.mainEditor,true,true);
          else if (!This.showData && This.metaEditor) e.Search(This.metaEditor);
        });

  }

  setShowData(setting) {
    this.showData = setting;
  }

  getShowData() {
    return(this.showData);
  }

  errors() {
    if (this.mainEditor) {
      var annot_list = this.mainEditor.getSession().getAnnotations();
      if (annot_list && annot_list.length)
        for (var i=0; i < annot_list.length; i++)
          if (annot_list[i].type == "error") {
            return true;
          }

      // don't allow empty documents or documents > 10MB
      if ((this.mainEditor.getSession().getValue().trim().length == 0) ||
          (this.mainEditor.getSession().getValue().trim().length > 10*1024*1024))
        return true;

      // don't allow empty doc id
      if (!this.doc_id)
        return true;
    }
    return false;
  }

  onMainEditorReady(editor) {
    var This = this;
    this.mainEditor = editor;
    editor.$blockScrolling = Infinity;
    editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
    editor.setReadOnly(this.readonly);
    editor.getSession().on("changeAnnotation", function() {
      var annot_list = editor.getSession().getAnnotations();
      if (annot_list && annot_list.length) for (var i=0; i < annot_list.length; i++)
        if (annot_list[i].type == "error") {
          This.error_message = "Error on row: " + annot_list[i].row + ": " + annot_list[i].text;
          //dialogScope.$applyAsync(function() {});
          return;
        }
      if (editor) {
        This.error_message = null; // no errors found
        //dialogScope.$applyAsync(function() {});
      }
    });
    if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
      editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

    editor.setOptions({
      mode: 'ace/mode/json',
      showGutter: true,
      wrap: true,
    });
  }

  onMetaEditorReady(editor) {
    this.metaEditor = editor;
    editor.$blockScrolling = Infinity;
    editor.renderer.setPrintMarginColumn(false); // hide page boundary lines
    editor.setReadOnly(true);
    if (/^((?!chrome).)*safari/i.test(navigator.userAgent))
      editor.renderer.scrollBarV.width = 20; // fix for missing scrollbars in Safari

    editor.setOptions({
      mode: 'ace/mode/json',
      showGutter: true,
      wrap: true
    });
  }

}
