import { NgModule }               from '/ui/web_modules/@angular/core.js';
import { UIRouterModule }         from "/ui/web_modules/@uirouter/angular.js";
import { MnElementCraneModule }   from '/ui/app/mn.element.crane.js';
import { FormsModule }            from '/ui/web_modules/@angular/forms.js';
import { CommonModule }           from '/ui/web_modules/@angular/common.js';
import { ReactiveFormsModule }    from '/ui/web_modules/@angular/forms.js';

import { NgbModule }              from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';

import { QwDocumentsComponent }   from './qw.documents.component.js';
import { QwImportComponent }      from './qw.import.component.js';
import { QwDocsSubNavComponent } from './qw.documents.subnav.js';

import { QwDirectivesModule }     from "../angular-directives/qw.directives.module.js";

import { QwCollectionsService }   from "/_p/ui/query/angular-services/qw.collections.service.js";
import { QwConstantsService }     from "/_p/ui/query/angular-services/qw.constants.service.js";
import { QwDialogService }        from "/_p/ui/query/angular-directives/qw.dialog.service.js";
import { QwFixLongNumberService } from "/_p/ui/query/angular-services/qw.fix.long.number.service.js";
import { QwImportService }        from '/_p/ui/query/angular-services/qw.import.service.js';
import { QwQueryService }         from "/_p/ui/query/angular-services/qw.query.service.js";
import { QwQueryPlanService }     from "/_p/ui/query/angular-services/qw.query.plan.service.js";
import { QwValidateQueryService } from "/_p/ui/query/angular-services/qw.validate.query.service.js";
import { $http }                  from '/_p/ui/query/angular-services/qw.http.js';

import { NgxAceModule } from '/ui/web_modules/@nowzoo/ngx-ace.js';


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
        //compat: "atLeast70"    // Cheshire Cat
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
//    permissions: "cluster.bucket['.'].collections.read", // restricted by permissions?
        title: "Documents",  // appears in breadcrumbs in title bar
 //       compat: "atLeast70"    // Cheshire Cat
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
        QwQueryPlanService,
        QwValidateQueryService,
        $http
      ],
    })
  ]}
}
