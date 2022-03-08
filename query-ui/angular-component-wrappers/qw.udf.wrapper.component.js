/*
Copyright 2022-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
  ViewEncapsulation,
  ChangeDetectorRef}               from '@angular/core';

import { NgbModal, NgbModalConfig }from '@ng-bootstrap/ng-bootstrap';

import template                    from './qw.udf.wrapper.html';
export {QwUdfWrapperComponent};


class QwUdfWrapperComponent extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
      new Component({
        template,
        encapsulation: ViewEncapsulation.None,
      })
    ]
  }

  static get parameters() {
    return [
      NgbModal,
    ];
  }

  ngOnInit() {
  }

  constructor() {
    super();

  }

  ngOnDestroy() {
  }
}