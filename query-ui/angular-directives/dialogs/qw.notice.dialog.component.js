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

import template                       from "./qw.notice.dialog.html";

export { QwNoticeDialog };

class QwNoticeDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      template,
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
