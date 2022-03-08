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

import { QwQueryWorkbenchService }          from '../../angular-services/qw.query.workbench.service.js';
import { QwMetadataService }       from "../../angular-services/qw.metadata.service.js";

export {QwInsightsComponent};


class QwInsightsComponent extends MnLifeCycleHooksToStream {
    static get annotations() {
        return [
            new Component({
                selector: "qw-insights-component",
                templateUrl: "../_p/ui/query/angular-components/workbench/qw.insights.html",
                //styleUrls: ["../../angular-directives/qw.directives.css"],
                encapsulation: ViewEncapsulation.None,
                inputs: [
                  "hideExpandToggle"
                ],
            })
        ]
    }

    static get parameters() {
        return [
            QwMetadataService,
            QwQueryWorkbenchService,
        ];
    }

    constructor(
        qwMetadataService,
        qwQueryService) {
        super();

        this.qqs = qwQueryService;
        this.qms = qwMetadataService;
    }

    ngOnInit() {
    }

    ngOnDestroy() {
    }

    toggleAnalysisSize() {

    }
}