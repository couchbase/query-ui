import {MnLifeCycleHooksToStream}  from 'mn.core';
import {Component,
    ViewEncapsulation,
    ChangeDetectorRef}               from '@angular/core';

import { QwQueryService }          from '../../angular-services/qw.query.service.js';
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
            QwQueryService,
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