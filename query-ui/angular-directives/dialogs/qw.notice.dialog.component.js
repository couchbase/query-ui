import {MnLifeCycleHooksToStream} from '/ui/app/mn.core.js';
import {NgbActiveModal} from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';
import {Component, ViewEncapsulation} from '/ui/web_modules/@angular/core.js';
import { CommonModule }        from '/ui/web_modules/@angular/common.js';

import {FormControl, FormGroup} from '/ui/web_modules/@angular/forms.js';

import _ from "/ui/web_modules/lodash.js";

export { QwNoticeDialog };

class QwNoticeDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "/_p/ui/query/angular-directives/dialogs/qw.notice.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: ["header_message", "body_message", "body_message_array"],
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
  }

}
