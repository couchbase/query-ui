import {MnLifeCycleHooksToStream} from 'mn.core';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {Component, ViewEncapsulation} from '@angular/core';
import { CommonModule }        from '@angular/common';

import {FormControl, FormGroup} from '@angular/forms';

import _ from "lodash";

export { QwErrorDialog };

class QwErrorDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "/_p/ui/query/angular-directives/dialogs/qw.error.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: ["error_title", "error_detail", "error_detail_array", "hide_cancel"],
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
