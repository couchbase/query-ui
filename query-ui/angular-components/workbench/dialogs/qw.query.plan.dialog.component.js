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

import { QwQueryPlanService }         from '../../../angular-services/qw.query.plan.service.js';

import _                              from "lodash";

export { QwQueryPlanDialog };

class QwQueryPlanDialog extends MnLifeCycleHooksToStream {
  static get annotations() {
    return [
    new Component({
      templateUrl: "../_p/ui/query/angular-components/workbench/dialogs/qw.query.plan.dialog.html",
      styleUrls: ["../_p/ui/query/angular-directives/qw.directives.css"],
      imports: [ CommonModule ],
      inputs: [],
      encapsulation: ViewEncapsulation.None,
    })
  ]}

  static get parameters() {
    return [
      NgbActiveModal,
      QwQueryPlanService,
      ];
  }

  constructor(
    activeModal,
    queryPlanService,
  ) {
    super();

    this.activeModal = activeModal;
    this.show_plan = true;
    this.queryPlanService = queryPlanService;
  }

  ngOnInit() {
    if (this.plan) {
      this.planText = JSON.stringify(this.plan,null,2);

      var lists = this.queryPlanService.analyzePlan(this.plan, null);
      this.analyzedPlan =
        {
          explain: {plan: this.plan, text: this.statement},
          analysis: lists,
          plan_nodes: this.queryPlanService.convertN1QLPlanToPlanNodes(this.plan, null, lists)
        };
    }
  }

  ngAfterViewInit() {
  }

  set_show_plan(visible) {
    this.show_plan = visible;
  }

  // set the Ace options
  acePlanLoaded(_editor) {
    _editor.setOptions({
      mode: 'ace/mode/json',
      showGutter: true
    });

    _editor.$blockScrolling = Infinity;
    _editor.setFontSize('11px');
    _editor.renderer.setPrintMarginColumn(false);
    _editor.setReadOnly(true);
  }
}
