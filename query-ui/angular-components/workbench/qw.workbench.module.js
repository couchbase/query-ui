import { NgModule }               from '@angular/core';
import { UIRouterModule }         from '@uirouter/angular';
import { MnElementCraneModule }   from 'mn.element.crane';
import { FormsModule }            from '@angular/forms';
import { CommonModule }           from '@angular/common';
import { ReactiveFormsModule }    from '@angular/forms';

import { NgbModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import { QwQueryComponent }          from './qw.query.component.js';
import { QwMonitorComponent }        from './qw.monitor.component.js';
import { QwWorkbenchSubNavComponent }from './qw.workbench.subnav.js';
import { QwAdviceVizComponent }      from './qw.advice.viz.component.js';

import { QwDirectivesModule }     from "../../angular-directives/qw.directives.module.js";
import { QwDialogService }        from "../../angular-directives/qw.dialog.service.js";

import { QwCollectionsService }   from "../../angular-services/qw.collections.service.js";
import { QwConstantsService }     from "../../angular-services/qw.constants.service.js";
import { QwFixLongNumberService } from "../../angular-services/qw.fix.long.number.service.js";
import { QwImportService }        from '../../angular-services/qw.import.service.js';
import { QwQueryService }         from "../../angular-services/qw.query.service.js";
import { QwQueryPlanService }     from "../../angular-services/qw.query.plan.service.js";
import { QwValidateQueryService } from "../../angular-services/qw.validate.query.service.js";
import { QwHttp }                 from '../../angular-services/qw.http.js';

import { QwFileImportDialog }     from '../../angular-components/workbench/dialogs/qw.file.import.dialog.component.js';
import { QwUnifiedFileDialog }    from '../../angular-components/workbench/dialogs/qw.unified.file.dialog.component.js';
import { QwHistoryDialog }        from '../../angular-components/workbench/dialogs/qw.history.dialog.component.js';
import { QwPrefsDialog }          from '../../angular-components/workbench/dialogs/qw.prefs.dialog.component.js';
import { QwQueryPlanDialog }      from '../../angular-components/workbench/dialogs/qw.query.plan.dialog.component.js';

import { NgxAceModule }           from 'ace/@nowzoo/ngx-ace';


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
        component: QwQueryComponent
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
        component: QwMonitorComponent
      }
    }
  },

];

export { QwWorkbenchModule };

class QwWorkbenchModule {
  static get annotations() { return [
    new NgModule({
      entryComponents: [
        QwMonitorComponent,
        QwQueryComponent,
        QwAdviceVizComponent,
        QwWorkbenchSubNavComponent,
        QwFileImportDialog,
        QwHistoryDialog,
        QwPrefsDialog,
        QwQueryPlanDialog,
        QwUnifiedFileDialog,
      ],
      declarations: [
        QwMonitorComponent,
        QwQueryComponent,
        QwWorkbenchSubNavComponent,
        QwAdviceVizComponent,

        // dialog used in the workbench
        QwFileImportDialog,
        QwHistoryDialog,
        QwPrefsDialog,
        QwQueryPlanDialog,
        QwUnifiedFileDialog,
      ],
      imports: [
        MnElementCraneModule,
        UIRouterModule.forChild({ states: documentsStates }),
        QwDirectivesModule,
        FormsModule,
        CommonModule,
        ReactiveFormsModule,
        NgbModalModule, // needed to show dialogs
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
        QwHttp
      ],
    })
  ]}
}
