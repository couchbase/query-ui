import { NgModule } from '/ui/web_modules/@angular/core.js';
import { UIRouterModule } from "/ui/web_modules/@uirouter/angular.js";
import { MnElementCraneModule } from '/ui/app/mn.element.crane.js';
import { FormsModule }        from '/ui/web_modules/@angular/forms.js';
import { CommonModule }        from '/ui/web_modules/@angular/common.js';
import { ReactiveFormsModule } from '/ui/web_modules/@angular/forms.js';

import { NgbModule }             from '/ui/web_modules/@ng-bootstrap/ng-bootstrap.js';

import { QwDocumentsComponent } from './qw.documents.component.js';

import { QwDirectivesModule } from "../angular-directives/qw.directives.module.js";

import { QwConstantsService }     from "/_p/ui/query/angular-services/qw.constants.service.js";
import { QwDocEditorService }     from "/_p/ui/query/angular-services/qw.upgraded.providers.js";
//import { QwDocEditorService }     from "/ui/app/ajs.upgraded.providers.js";
import { QwFixLongNumberService } from "/_p/ui/query/angular-services/qw.fix.long.number.service.js";
import { QwValidateQueryService } from "/_p/ui/query/angular-services/qw.validate.query.service.js";
import { QwQueryService }         from "/_p/ui/query/angular-services/qw.query.service.js";
import { QwQueryPlanService }     from "/_p/ui/query/angular-services/qw.query.plan.service.js";

import { $http } from '/_p/ui/query/angular-services/qw.http.js';

let collectionsState = {
  url: '/documents',
  name: "app.admin.doc_editor",
  data: {
//    permissions: "cluster.bucket['.'].collections.read", // restricted by permissions?
    title: "Documents",  // appears in breadcrumbs in title bar
    compat: "atLeast70"    // Cheshire Cat
  },
  params: { // can parameters be sent via the URL?
    bucket: {
      type: 'string',
      dynamic: true
    }
  },
  views: {
    "main@app.admin": {
      component: QwDocumentsComponent
    }
  }
};

export { QwDocumentsModule };

class QwDocumentsModule {
  static get annotations() { return [
    new NgModule({
      entryComponents: [
        QwDocumentsComponent,
      ],
      declarations: [
        QwDocumentsComponent,
      ],
      imports: [
        MnElementCraneModule,
        UIRouterModule.forChild({ states: [collectionsState] }),
        QwDirectivesModule,
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        NgbModule, // for tooltips
        ],
      providers: [
        QwConstantsService,
        QwDocEditorService,
        QwFixLongNumberService,
        QwQueryService,
        QwQueryPlanService,
        QwValidateQueryService,
        $http
      ],
    })
  ]}
}
