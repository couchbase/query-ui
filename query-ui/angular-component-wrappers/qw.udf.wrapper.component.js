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