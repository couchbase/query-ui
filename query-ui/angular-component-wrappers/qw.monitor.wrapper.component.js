/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import {is}                        from 'ramda';
import _                           from 'lodash';
import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
  ViewEncapsulation,
  ChangeDetectorRef}               from '@angular/core';

import { NgbModal, NgbModalConfig }from '@ng-bootstrap/ng-bootstrap';

import { UIRouter }                from '@uirouter/angular';

import { BehaviorSubject, timer}   from "rxjs";
import { switchMap,
  shareReplay,
  takeUntil}                       from 'rxjs/operators';

import template                    from './qw.monitor.wrapper.html';

export {QwMonitorWrapperComponent};


class QwMonitorWrapperComponent extends MnLifeCycleHooksToStream {
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
      ChangeDetectorRef,
      NgbModal,
      NgbModalConfig,
      UIRouter,
    ];
  }

  ngOnInit() {
  }

  constructor(
    cdr,
    ngbModal,
    ngbModalConfig,
    uiRouter,
  ) {
    super();

    this.This = this;
    this.router = uiRouter;
  }

  ngOnDestroy() {
  }

  navigateToQuery(queryText) {
    this.router.stateService.go("app.admin.query.workbench",{query: queryText});
  }
}
