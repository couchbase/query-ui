/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import ace                            from 'ace/ace';
import _                              from 'lodash';
import {MnLifeCycleHooksToStream}     from 'mn.core';
import {Component,
        ElementRef,
        ViewEncapsulation,
        ChangeDetectorRef}            from '@angular/core';
import {UIRouter}                     from '@uirouter/angular';

import { NgbModal, NgbModalConfig }   from '@ng-bootstrap/ng-bootstrap';

import { BehaviorSubject, fromEvent } from 'rxjs';

import { QwMetadataService }          from "../angular-services/qw.metadata.service.js";

import template                       from "./qw.query.wrapper.html";

export {QwQueryWrapperComponent};


class QwQueryWrapperComponent extends MnLifeCycleHooksToStream {
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
      ElementRef,
      NgbModal,
      NgbModalConfig,
      QwMetadataService,
      UIRouter,
    ];
  }

  ngOnInit() {
    this.params = this.uiRouter.globals.params;
    this.resizeObservable = fromEvent(window,'resize');
    this.resizeSubscription = this.resizeObservable.subscribe( evt => this.qc && this.qc.updateEditorSizes && this.qc.updateEditorSizes());
  }

  ngAfterViewInit() {
    // for unknown reasons the context menu is not picking up the value on reload
    // force it to notice a change by setting to null, then resetting after some amount of time.
    //if (this.qc.lastResult().query_context_bucket) {
    //  let cachedBucket = this.qc.lastResult().query_context_bucket;
    //  this.qc.lastResult().query_context_bucket = null;
    //  setTimeout(() => {
    //    this.qc.lastResult().query_context_bucket = cachedBucket;
    //  }, 500);
    //}
  }

  ngOnDestroy() {
    this.resizeSubscription.unsubscribe();
  }

  //
  // constructor
  //

  constructor(cdr,
              element,
              ngbModal,
              ngbModalConfig,
              qwMetadataService,
              uiRouter
  ) {
    super();

    this.This = this;
    this.uiRouter = uiRouter;
    this.qms = qwMetadataService;

    // if we receive a query parameter, pass it to our wrapped component
    var params = this.uiRouter.globals.params;
    if (params && _.isString(params.query) && params.query.length > 0) {
      this.queryParam = params.query;
    }


  }

  showOptions() {
    if (this.wrapped)
      return(this.wrapped.qc.showOptions());
    else
      return false;
  }

  options() {
    if (this.wrapped)
      return(this.wrapped.options());
  }

  unified_save() {
    if (this.wrapped)
      return(this.wrapped.qc.unified_save());
  }

  do_import() {
    if (this.wrapped)
      return(this.wrapped.qc.do_import());
  }
}
