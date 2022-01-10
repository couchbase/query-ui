/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { NgModule }               from '@angular/core';
import { UIRouterModule }         from '@uirouter/angular';
import { MnElementCraneModule }   from 'mn.element.crane';
import { FormsModule }            from '@angular/forms';
import { CommonModule }           from '@angular/common';
import { ReactiveFormsModule }    from '@angular/forms';

import { NgbModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import { QwQueryWrapperComponent }   from './qw.query.wrapper.component.js';
import { QwMonitorWrapperComponent } from './qw.monitor.wrapper.component.js';
import { QwUdfWrapperComponent }     from './qw.udf.wrapper.component.js';
import { QwWorkbenchSubNavComponent }from './qw.workbench.subnav.js';

import { QwWorkbenchModule}          from "../angular-components/workbench/qw.workbench.module.js";

import { QwMetadataService }         from "../angular-services/qw.metadata.service.js";
import { QwQueryService }            from "../angular-services/qw.query.service.js";
import { QwHttp }                    from '../angular-services/qw.http.js';

let documentsStates = [
  {
    url: '/query',
    name: "app.admin.query",
    data: {
      title: "Query",  // appears in breadcrumbs in title bar
    },
    abstract: true,
  },
  {
    url: '/workbench?query',
    name: 'app.admin.query.workbench',
    data: {
      title: "Query",  // appears in breadcrumbs in title bar
      //compat: "atLeast70"    // Cheshire Cat
    },
    params: {
      query: {
        type: 'string',
        dynamic: true
      },
    },
    views: {
      "main@app.admin": {
        component: QwQueryWrapperComponent
      }
    }
  },
  {
    url: '/monitor',
    name: 'app.admin.query.monitor',
    data: {
      title: "Query",  // appears in breadcrumbs in title bar
      //       compat: "atLeast70"    // Cheshire Cat
    },
    views: {
      "main@app.admin": {
        component: QwMonitorWrapperComponent
      }
    }
  },
  {
    url: '/udf',
    name: 'app.admin.query.udf',
    data: {
      title: "UDFs",  // appears in breadcrumbs in title bar
      //compat: "atLeast70"    // Cheshire Cat
    },
    views: {
      "main@app.admin": {
        component: QwUdfWrapperComponent
      }
    }
  },

];

export { QwWrapperModule };

class QwWrapperModule {
  static get annotations() { return [
    new NgModule({
      entryComponents: [
        QwMonitorWrapperComponent,
        QwQueryWrapperComponent,
        QwUdfWrapperComponent,
        QwWorkbenchSubNavComponent,
      ],
      declarations: [
        QwMonitorWrapperComponent,
        QwQueryWrapperComponent,
        QwUdfWrapperComponent,
        QwWorkbenchSubNavComponent,
      ],
      imports: [
        QwWorkbenchModule,
        MnElementCraneModule,
        UIRouterModule.forChild({ states: documentsStates }),
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        NgbModalModule, // needed to show dialogs
        NgbModule, // for tooltips
      ],
      exports: [
        QwMonitorWrapperComponent,
        QwQueryWrapperComponent,
        QwUdfWrapperComponent,
        QwWorkbenchSubNavComponent,
      ],
      providers: [
        QwMetadataService,
        QwQueryService,
        QwHttp,
      ],
    })
  ]}
}
