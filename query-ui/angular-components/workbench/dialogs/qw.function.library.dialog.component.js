import {MnLifeCycleHooksToStream}     from 'mn.core';
import {NgbActiveModal}               from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }               from '@angular/common';
import { QwQueryService }             from '../../../angular-services/qw.query.service.js';
import { QwDialogService }            from '../../../angular-directives/qw.dialog.service.js';
import _                              from 'lodash';

export { QwFunctionLibraryDialog };

class QwFunctionLibraryDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-components/workbench/dialogs/qw.function.library.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: ["header", "lib_name","lib_contents", "new_lib"],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwDialogService,
      QwQueryService,
      ];
  }

  ngOnInit() {
  }

  constructor(activeModal,
              qwDialogService,
              qwQueryService) {
    super();

    this.activeModal = activeModal;
    this.qqs = qwQueryService;
    this.qds = qwDialogService;
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
          if (This.mainEditor) e.Search(This.mainEditor,true,true);
        });

  }

  errors() {
    // don't allow empty doc id
    if (!this.lib_name)
      return true;

    if (this.new_lib && this.libraryNameUsed())
      return true;

    return false;
  }

  libraryNameUsed() {
    return this.qqs.udfLibs.some(udfLib => udfLib.name == this.lib_name);
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
    this.error = null;
    var This = this;
    this.qqs.newUDFlib(this.lib_name, this.lib_contents)
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
