/*
Copyright 2021-Present Couchbase, Inc.

Use of this software is governed by the Business Source License included in
the file licenses/BSL-Couchbase.txt.  As of the Change Date specified in that
file, in accordance with the Business Source License, use of this software will
be governed by the Apache License, Version 2.0, included in the file
licenses/APL2.txt.
*/

import { NgModule }               from '@angular/core';
import { UIRouterModule }         from "@uirouter/angular";
import { MnElementCraneModule }   from 'mn.element.crane';
import { FormsModule }            from '@angular/forms';
import { CommonModule }           from '@angular/common';
import { ReactiveFormsModule }    from '@angular/forms';

import { NgbModule }              from '@ng-bootstrap/ng-bootstrap';

import { QwDocumentsComponent }   from './qw.documents.component.js';
import { QwImportComponent }      from './qw.import.component.js';
import { QwDocsSubNavComponent }  from './qw.documents.subnav.js';

import { QwDirectivesModule }     from "../../angular-directives/qw.directives.module.js";

import { QwCollectionsService }   from "../../angular-services/qw.collections.service.js";
import { QwConstantsService }     from "../../angular-services/qw.constants.service.js";
import { QwDialogService }        from "../../angular-directives/qw.dialog.service.js";
import { QwFixLongNumberService } from "../../angular-services/qw.fix.long.number.service.js";
import { QwImportService }        from '../../angular-services/qw.import.service.js';
import { QwQueryService }         from "../../angular-services/qw.query.service.js";
import { QwQueryWorkbenchService }from "../../angular-services/qw.query.workbench.service.js";
import { QwQueryPlanService }     from "../../angular-services/qw.query.plan.service.js";
import { QwHttp }                 from '../../angular-services/qw.http.js';

import { NgxAceModule } from 'ace/@nowzoo/ngx-ace';


let documentsStates = [
    {
      url: '/docs',
      name: "app.admin.docs",
      data: {
        title: "Documents",  // appears in breadcrumbs in title bar
      },
      abstract: true,
    },
    {
      url: '/editor?bucket&scope&collection',
      name: 'app.admin.docs.editor',
      data: {
        title: "Documents",  // appears in breadcrumbs in title bar
        permissions: "cluster.collection['.:.:.'].data.docs.read",
      },
      params: { // can parameters be sent via the URL?
        bucket: {
          type: 'string',
          dynamic: true
        },
        scope: {
          type: 'string',
          dynamic: true
        },
        collection: {
          type: 'string',
          dynamic: true
        }
      },
      views: {
        "main@app.admin": {
          component: QwDocumentsComponent
        }
      }
    },
    {
      url: '/import',
      name: 'app.admin.docs.import',
      data: {
        title: "Documents",  // appears in breadcrumbs in title bar
      },
      views: {
        "main@app.admin": {
          component: QwImportComponent
        }
      }
    },

];

export { QwDocumentsModule };

class QwDocumentsModule {
  static get annotations() { return [
    new NgModule({
      entryComponents: [
        QwDocumentsComponent,
        QwImportComponent,
        QwDocsSubNavComponent,
      ],
      declarations: [
        QwDocumentsComponent,
        QwImportComponent,
        QwDocsSubNavComponent,
      ],
      imports: [
        MnElementCraneModule,
        UIRouterModule.forChild({ states: documentsStates }),
        QwDirectivesModule,
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        NgbModule, // for tooltips
        NgxAceModule.forRoot(),
        ],
      providers: [
        QwCollectionsService,
        QwConstantsService,
        QwDialogService,
        QwFixLongNumberService,
        QwImportService,
        QwQueryService,
        QwQueryWorkbenchService,
        QwQueryPlanService,
        QwHttp
      ],
    })
  ]}
}
