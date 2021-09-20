import {MnLifeCycleHooksToStream} from 'mn.core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }        from '@angular/common';

import {FormControl, FormGroup} from '@angular/forms';

import _ from "lodash";

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
