import {Directive, ElementRef, Injector} from '/ui/web_modules/@angular/core.js';
import {UpgradeComponent} from '/ui/web_modules/@angular/upgrade/static.js';

import qwJsonTableEditorModule from "/_p/ui/query/ui-current/data_display/qw-json-table-editor.directive.js";
import qwAceModule             from "/_p/ui/query/ui-current/data_display/qw-ace.component.js";

export { QwJsonTableEditorDirective, UIAceDirective };

class QwJsonTableEditorDirective extends UpgradeComponent {

  static get annotations() { return [
    new Directive({
      selector: "qw-json-table-editor",
      inputs: [
        "data",
        "controller",
      ]
    })
  ]}

  static get parameters() { return [
    ElementRef,
    Injector
  ]}

  constructor(elementRef, injector) {
    super('qwJsonTableEditor', elementRef, injector);
  }
}


class UIAceDirective extends UpgradeComponent {

  static get annotations() { return [
    new Directive({
      selector: "qw-ace",
      inputs: [
        "data",
        "options"
      ]
    })
  ]}

  static get parameters() { return [
    ElementRef,
    Injector
  ]}

  constructor(elementRef, injector) {
    super('qwAce', elementRef, injector);
  }
}